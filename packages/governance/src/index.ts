import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import {
  type Agent,
  type Approval,
  type ApprovalRule,
  type ChangedRegion,
  type ConstitutionRule,
  type GovernanceFinding,
  type OwnershipRule,
  type RiskBudgetRule,
  type RollbackRule,
  type RunArtifact,
  matchPattern,
  matchesAny,
  normalizePath,
  resolveRepoImport,
  summarizeMutationScore
} from '../../evidence-model/src/index';

export interface GovernanceEvaluationOptions {
  rootDir: string;
  constitution: ConstitutionRule[];
  changedFiles: string[];
  changedRegions: ChangedRegion[];
  approvals?: Approval[];
  attestationsClaims?: string[];
  run?: Pick<RunArtifact, 'complexity' | 'mutations' | 'verdict'>;
  runId?: string;
}

export interface GovernancePlan {
  summary: string;
  steps: Array<{
    type: 'test' | 'approval' | 'rollback' | 'boundary' | 'risk' | 'ownership';
    title: string;
    rationale: string;
    evidence: string[];
    tradeoffs: string[];
  }>;
}

interface ImportReference {
  kind: 'static' | 'require' | 'dynamic-import';
  specifier?: string;
  expressionText: string;
  resolvable: boolean;
}

type RequireLikeState = 'never' | 'always' | 'maybe';

interface ValueProvenance {
  state: RequireLikeState;
  objectProperties?: Map<string, ValueProvenance>;
  objectDynamic?: boolean;
  arrayElements?: ValueProvenance[];
  arrayDynamic?: boolean;
}

interface BindingScope {
  bindings: Map<string, ValueProvenance>;
  parent?: BindingScope;
}

function createBindingScope(parent?: BindingScope): BindingScope {
  return parent ? { bindings: new Map(), parent } : { bindings: new Map() };
}

function stringLikeModuleSpecifier(argument: any): string | undefined {
  if (!argument) {
    return undefined;
  }
  if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
    return argument.text;
  }
  return undefined;
}

function unwrapExpression(expression: any): any {
  let current = expression;
  while (
    current
    && (ts.isParenthesizedExpression(current)
      || ts.isAsExpression(current)
      || ts.isTypeAssertionExpression(current)
      || ts.isNonNullExpression(current))
  ) {
    current = current.expression;
  }
  return current;
}

function provenance(state: RequireLikeState, extra: Omit<ValueProvenance, 'state'> = {}): ValueProvenance {
  return { state, ...extra };
}

function joinRequireLikeState(left: RequireLikeState, right: RequireLikeState): RequireLikeState {
  if (left === right) {
    return left;
  }
  if (left === 'maybe' || right === 'maybe') {
    return 'maybe';
  }
  return 'maybe';
}

function mergeProvenance(left: ValueProvenance, right: ValueProvenance): ValueProvenance {
  const merged: ValueProvenance = {
    state: joinRequireLikeState(left.state, right.state)
  };
  if (left.objectProperties || right.objectProperties || left.objectDynamic || right.objectDynamic) {
    const objectProperties = new Map<string, ValueProvenance>();
    const propertyNames = new Set<string>([
      ...Array.from(left.objectProperties?.keys() ?? []),
      ...Array.from(right.objectProperties?.keys() ?? [])
    ]);
    for (const propertyName of propertyNames) {
      const leftProperty = left.objectProperties?.get(propertyName) ?? (left.objectDynamic ? provenance('maybe') : provenance('never'));
      const rightProperty = right.objectProperties?.get(propertyName) ?? (right.objectDynamic ? provenance('maybe') : provenance('never'));
      objectProperties.set(propertyName, mergeProvenance(leftProperty, rightProperty));
    }
    merged.objectProperties = objectProperties;
    if (left.objectDynamic || right.objectDynamic) {
      merged.objectDynamic = true;
    }
  }
  if (left.arrayElements || right.arrayElements || left.arrayDynamic || right.arrayDynamic) {
    const length = Math.max(left.arrayElements?.length ?? 0, right.arrayElements?.length ?? 0);
    merged.arrayElements = Array.from({ length }, (_, index) => mergeProvenance(
      left.arrayElements?.[index] ?? (left.arrayDynamic ? provenance('maybe') : provenance('never')),
      right.arrayElements?.[index] ?? (right.arrayDynamic ? provenance('maybe') : provenance('never'))
    ));
    if (left.arrayDynamic || right.arrayDynamic) {
      merged.arrayDynamic = true;
    }
  }
  return merged;
}

function lookupBindingProvenance(scope: BindingScope, name: string): ValueProvenance {
  let current: BindingScope | undefined = scope;
  while (current) {
    if (current.bindings.has(name)) {
      return current.bindings.get(name)!;
    }
    current = current.parent;
  }
  return name === 'require' ? provenance('always') : provenance('never');
}

function assignBinding(scope: BindingScope, name: string, value: ValueProvenance): void {
  let current: BindingScope | undefined = scope;
  while (current) {
    if (current.bindings.has(name)) {
      current.bindings.set(name, value);
      return;
    }
    current = current.parent;
  }
  if (name !== 'require') {
    scope.bindings.set(name, value);
  }
}

function propertyNameText(name: any): string | undefined {
  if (!name || ts.isComputedPropertyName(name)) {
    return undefined;
  }
  if (
    ts.isIdentifier(name)
    || ts.isStringLiteral(name)
    || ts.isNumericLiteral(name)
    || ts.isNoSubstitutionTemplateLiteral(name)
  ) {
    return name.text;
  }
  return undefined;
}

function objectPropertyName(target: any): string | undefined {
  if (ts.isBindingElement(target)) {
    return propertyNameText(target.propertyName ?? (ts.isIdentifier(target.name) ? target.name : undefined));
  }
  if (ts.isShorthandPropertyAssignment(target)) {
    return target.name.text;
  }
  if (ts.isPropertyAssignment(target)) {
    return propertyNameText(target.name);
  }
  return undefined;
}

function objectPropertyProvenance(value: ValueProvenance, propertyName: string): ValueProvenance | undefined {
  if (value.objectProperties?.has(propertyName)) {
    return value.objectProperties.get(propertyName)!;
  }
  if (value.objectProperties || value.objectDynamic) {
    return value.objectDynamic ? provenance('maybe') : undefined;
  }
  return undefined;
}

function arrayElementProvenance(value: ValueProvenance, index: number): ValueProvenance | undefined {
  if (value.arrayElements && index < value.arrayElements.length) {
    return value.arrayElements[index];
  }
  if (value.arrayElements || value.arrayDynamic) {
    return value.arrayDynamic ? provenance('maybe') : undefined;
  }
  return undefined;
}

function elementAccessKey(argumentExpression: any): string | number | undefined {
  const candidate = unwrapExpression(argumentExpression);
  if (!candidate) {
    return undefined;
  }
  if (ts.isStringLiteral(candidate) || ts.isNoSubstitutionTemplateLiteral(candidate)) {
    return candidate.text;
  }
  if (ts.isNumericLiteral(candidate)) {
    return Number(candidate.text);
  }
  return undefined;
}

function numericKeyFromText(text: string): number | undefined {
  return /^(0|[1-9]\d*)$/u.test(text) ? Number(text) : undefined;
}

function arrayRestProvenance(value: ValueProvenance, startIndex: number): ValueProvenance {
  return provenance('never', {
    ...(value.arrayElements ? { arrayElements: value.arrayElements.slice(startIndex) } : {}),
    ...(value.arrayDynamic ? { arrayDynamic: true } : {})
  });
}

function objectRestProvenance(value: ValueProvenance, excludedKeys: Set<string>): ValueProvenance {
  const objectProperties = value.objectProperties
    ? new Map(Array.from(value.objectProperties.entries()).filter(([propertyName]) => !excludedKeys.has(propertyName)))
    : undefined;
  return provenance('never', {
    ...(objectProperties ? { objectProperties } : {}),
    ...(value.objectDynamic ? { objectDynamic: true } : {})
  });
}

function explicitObjectKeys(elements: Iterable<any>): Set<string> {
  const keys = new Set<string>();
  for (const element of elements) {
    if (ts.isBindingElement(element)) {
      if (element.dotDotDotToken) {
        continue;
      }
      const propertyName = objectPropertyName(element);
      if (typeof propertyName === 'string') {
        keys.add(propertyName);
      }
      continue;
    }
    if (ts.isShorthandPropertyAssignment(element)) {
      keys.add(element.name.text);
      continue;
    }
    if (ts.isPropertyAssignment(element)) {
      const propertyName = propertyNameText(element.name);
      if (typeof propertyName === 'string') {
        keys.add(propertyName);
      }
    }
  }
  return keys;
}

function propertyAccessProvenance(value: ValueProvenance, key: string | number): ValueProvenance | undefined {
  if (typeof key === 'number') {
    return arrayElementProvenance(value, key)
      ?? objectPropertyProvenance(value, String(key));
  }
  const numericKey = numericKeyFromText(key);
  if (typeof numericKey === 'number') {
    return arrayElementProvenance(value, numericKey)
      ?? objectPropertyProvenance(value, key);
  }
  return objectPropertyProvenance(value, key);
}

function expressionProvenance(expression: any, scope: BindingScope): ValueProvenance {
  const candidate = unwrapExpression(expression);
  if (!candidate) {
    return provenance('never');
  }
  if (ts.isIdentifier(candidate)) {
    return lookupBindingProvenance(scope, candidate.text);
  }
  if (ts.isBinaryExpression(candidate) && candidate.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    return expressionProvenance(candidate.right, scope);
  }
  if (ts.isConditionalExpression(candidate)) {
    return mergeProvenance(expressionProvenance(candidate.whenTrue, scope), expressionProvenance(candidate.whenFalse, scope));
  }
  if (ts.isPropertyAccessExpression(candidate)) {
    return propertyAccessProvenance(expressionProvenance(candidate.expression, scope), candidate.name.text) ?? provenance('never');
  }
  if (ts.isElementAccessExpression(candidate)) {
    const key = elementAccessKey(candidate.argumentExpression);
    return typeof key === 'undefined'
      ? provenance('never')
      : propertyAccessProvenance(expressionProvenance(candidate.expression, scope), key) ?? provenance('never');
  }
  if (ts.isObjectLiteralExpression(candidate)) {
    const objectProperties = new Map<string, ValueProvenance>();
    let objectDynamic = false;
    for (const property of candidate.properties) {
      if (ts.isSpreadAssignment(property)) {
        objectDynamic = true;
        continue;
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        objectProperties.set(property.name.text, expressionProvenance(property.name, scope));
        continue;
      }
      if (ts.isPropertyAssignment(property)) {
        const propertyName = propertyNameText(property.name);
        if (typeof propertyName === 'string') {
          objectProperties.set(propertyName, expressionProvenance(property.initializer, scope));
        } else {
          objectDynamic = true;
        }
        continue;
      }
      const propertyName = propertyNameText(property.name);
      if (typeof propertyName === 'string') {
        objectProperties.set(propertyName, provenance('never'));
      } else {
        objectDynamic = true;
      }
    }
    return provenance('never', {
      objectProperties,
      ...(objectDynamic ? { objectDynamic: true } : {})
    });
  }
  if (ts.isArrayLiteralExpression(candidate)) {
    const arrayElements: ValueProvenance[] = [];
    let arrayDynamic = false;
    for (const element of candidate.elements) {
      if (ts.isOmittedExpression(element)) {
        arrayElements.push(provenance('never'));
        continue;
      }
      if (ts.isSpreadElement(element)) {
        arrayDynamic = true;
        arrayElements.push(provenance('maybe'));
        continue;
      }
      arrayElements.push(expressionProvenance(element, scope));
    }
    return provenance('never', {
      arrayElements,
      ...(arrayDynamic ? { arrayDynamic: true } : {})
    });
  }
  return provenance('never');
}

function expressionIsRequireLike(expression: any, scope: BindingScope): boolean {
  return expressionProvenance(expression, scope).state === 'always';
}

function declareBindingName(name: any, value: ValueProvenance, scope: BindingScope): void {
  if (ts.isIdentifier(name)) {
    scope.bindings.set(name.text, value);
    return;
  }
  if (ts.isArrayBindingPattern(name)) {
    for (let index = 0; index < name.elements.length; index += 1) {
      const element = name.elements[index];
      if (!ts.isBindingElement(element)) {
        continue;
      }
      const matchedValue = element.dotDotDotToken
        ? arrayRestProvenance(value, index)
        : arrayElementProvenance(value, index);
      declareBindingName(element.name, matchedValue ?? (element.initializer ? expressionProvenance(element.initializer, scope) : provenance('never')), scope);
    }
    return;
  }
  const excludedKeys = explicitObjectKeys(name.elements);
  for (const element of name.elements) {
    if (ts.isBindingElement(element)) {
      const matchedValue = element.dotDotDotToken
        ? objectRestProvenance(value, excludedKeys)
        : (() => {
            const propertyName = objectPropertyName(element);
            return typeof propertyName === 'string' ? objectPropertyProvenance(value, propertyName) : undefined;
          })();
      declareBindingName(element.name, matchedValue ?? (element.initializer ? expressionProvenance(element.initializer, scope) : provenance('never')), scope);
    }
  }
}

function assignBindingTarget(target: any, value: ValueProvenance, scope: BindingScope): void {
  if (ts.isIdentifier(target)) {
    assignBinding(scope, target.text, value);
    return;
  }
  if (ts.isArrayLiteralExpression(target)) {
    for (let index = 0; index < target.elements.length; index += 1) {
      const element = target.elements[index];
      if (ts.isOmittedExpression(element)) {
        continue;
      }
      if (ts.isSpreadElement(element)) {
        assignBindingTarget(element.expression, arrayRestProvenance(value, index), scope);
        continue;
      }
      assignBindingTarget(element, arrayElementProvenance(value, index) ?? provenance('never'), scope);
    }
    return;
  }
  if (ts.isObjectLiteralExpression(target)) {
    const excludedKeys = explicitObjectKeys(target.properties);
    for (const property of target.properties) {
      if (ts.isShorthandPropertyAssignment(property)) {
        assignBindingTarget(property.name, objectPropertyProvenance(value, property.name.text) ?? provenance('never'), scope);
        continue;
      }
      if (ts.isPropertyAssignment(property)) {
        const propertyName = propertyNameText(property.name);
        assignBindingTarget(property.initializer, typeof propertyName === 'string' ? objectPropertyProvenance(value, propertyName) ?? provenance('never') : provenance('maybe'), scope);
        continue;
      }
      if (ts.isSpreadAssignment(property)) {
        assignBindingTarget(property.expression, objectRestProvenance(value, excludedKeys), scope);
      }
    }
  }
}

function declareImportBindings(node: any, scope: BindingScope): void {
  const clause = node.importClause;
  if (!clause) {
    return;
  }
  if (clause.name) {
    scope.bindings.set(clause.name.text, provenance('never'));
  }
  if (!clause.namedBindings) {
    return;
  }
  if (ts.isNamespaceImport(clause.namedBindings)) {
    scope.bindings.set(clause.namedBindings.name.text, provenance('never'));
    return;
  }
  for (const specifier of clause.namedBindings.elements) {
    scope.bindings.set(specifier.name.text, provenance('never'));
  }
}

function importsForFile(filePath: string, sourceText: string): ImportReference[] {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
  const imports: ImportReference[] = [];

  function visitStatements(statements: any, scope: BindingScope): void {
    for (const statement of statements) {
      visit(statement, scope);
    }
  }

  function visitFunctionLike(node: any, scope: BindingScope): void {
    const functionScope = createBindingScope(scope);
    if (node.name && ts.isIdentifier(node.name)) {
      functionScope.bindings.set(node.name.text, provenance('never'));
    }
    for (const parameter of node.parameters ?? []) {
      declareBindingName(parameter.name, provenance('never'), functionScope);
    }
    for (const parameter of node.parameters ?? []) {
      if (parameter.initializer) {
        visit(parameter.initializer, functionScope);
        declareBindingName(parameter.name, expressionProvenance(parameter.initializer, functionScope), functionScope);
      }
    }
    if (node.body) {
      visit(node.body, functionScope);
    }
  }

  function visitVariableDeclaration(node: any, scope: BindingScope): void {
    if (node.initializer) {
      visit(node.initializer, scope);
    }
    declareBindingName(node.name, expressionProvenance(node.initializer, scope), scope);
  }

  function visit(node: any, scope: BindingScope): void {
    if (!node) {
      return;
    }
    if (ts.isSourceFile(node) || ts.isModuleBlock(node)) {
      visitStatements(node.statements, scope);
      return;
    }
    if (ts.isBlock(node)) {
      visitStatements(node.statements, createBindingScope(scope));
      return;
    }
    if (ts.isCaseBlock(node)) {
      const caseScope = createBindingScope(scope);
      for (const clause of node.clauses) {
        visit(clause, caseScope);
      }
      return;
    }
    if (ts.isCaseClause(node)) {
      visit(node.expression, scope);
      visitStatements(node.statements, scope);
      return;
    }
    if (ts.isDefaultClause(node)) {
      visitStatements(node.statements, scope);
      return;
    }
    if (ts.isImportDeclaration(node)) {
      const specifier = stringLikeModuleSpecifier(node.moduleSpecifier);
      if (typeof specifier === 'string') {
        imports.push({
          kind: 'static',
          specifier,
          expressionText: node.moduleSpecifier.getText(sourceFile),
          resolvable: true
        });
      }
      declareImportBindings(node, scope);
      return;
    }
    if (ts.isImportEqualsDeclaration(node)) {
      scope.bindings.set(node.name.text, provenance('never'));
      if (ts.isExternalModuleReference(node.moduleReference)) {
        const specifier = stringLikeModuleSpecifier(node.moduleReference.expression);
        if (typeof specifier === 'string') {
          imports.push({
            kind: 'static',
            specifier,
            expressionText: node.moduleReference.expression.getText(sourceFile),
            resolvable: true
          });
        }
      }
      return;
    }
    if (ts.isExportDeclaration(node)) {
      const specifier = stringLikeModuleSpecifier(node.moduleSpecifier);
      if (typeof specifier === 'string') {
        imports.push({
          kind: 'static',
          specifier,
          expressionText: node.moduleSpecifier.getText(sourceFile),
          resolvable: true
        });
      }
      return;
    }
    if (ts.isFunctionDeclaration(node)) {
      if (node.name) {
        scope.bindings.set(node.name.text, provenance('never'));
      }
      visitFunctionLike(node, scope);
      return;
    }
    if (
      ts.isFunctionExpression(node)
      || ts.isArrowFunction(node)
      || ts.isMethodDeclaration(node)
      || ts.isGetAccessorDeclaration(node)
      || ts.isSetAccessorDeclaration(node)
      || ts.isConstructorDeclaration(node)
    ) {
      visitFunctionLike(node, scope);
      return;
    }
    if (ts.isClassDeclaration(node)) {
      if (node.name) {
        scope.bindings.set(node.name.text, provenance('never'));
      }
      ts.forEachChild(node, (child: any) => visit(child, scope));
      return;
    }
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        visitVariableDeclaration(declaration, scope);
      }
      return;
    }
    if (ts.isVariableDeclaration(node)) {
      visitVariableDeclaration(node, scope);
      return;
    }
    if (ts.isForStatement(node)) {
      const loopScope = createBindingScope(scope);
      visit(node.initializer, loopScope);
      visit(node.condition, loopScope);
      visit(node.incrementor, loopScope);
      visit(node.statement, loopScope);
      return;
    }
    if (ts.isForInStatement(node) || ts.isForOfStatement(node)) {
      const loopScope = createBindingScope(scope);
      visit(node.initializer, loopScope);
      visit(node.expression, loopScope);
      visit(node.statement, loopScope);
      return;
    }
    if (ts.isCatchClause(node)) {
      const catchScope = createBindingScope(scope);
      if (node.variableDeclaration) {
        declareBindingName(node.variableDeclaration.name, provenance('never'), catchScope);
      }
      visit(node.block, catchScope);
      return;
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      visit(node.right, scope);
      assignBindingTarget(node.left, expressionProvenance(node.right, scope), scope);
      return;
    }
    if (ts.isCallExpression(node)) {
      if (node.arguments.length === 1 && expressionIsRequireLike(node.expression, scope)) {
        const argument = node.arguments[0];
        const specifier = stringLikeModuleSpecifier(argument);
        imports.push({
          kind: 'require',
          ...(typeof specifier === 'string' ? { specifier } : {}),
          expressionText: argument.getText(sourceFile),
          resolvable: typeof specifier === 'string'
        });
      }
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1) {
        const argument = node.arguments[0];
        const specifier = stringLikeModuleSpecifier(argument);
        imports.push({
          kind: 'dynamic-import',
          ...(typeof specifier === 'string' ? { specifier } : {}),
          expressionText: argument.getText(sourceFile),
          resolvable: typeof specifier === 'string'
        });
      }
    }
    ts.forEachChild(node, (child: any) => visit(child, scope));
  }

  visit(sourceFile, createBindingScope());
  return imports;
}

function resolveImport(importerPath: string, specifier: string, rootDir: string): string | undefined {
  return resolveRepoImport(rootDir, importerPath, specifier);
}

function evaluateBoundaryRule(rootDir: string, rule: ConstitutionRule, changedFiles: string[]): GovernanceFinding[] {
  if (rule.kind !== 'boundary') {
    return [];
  }
  const findings: GovernanceFinding[] = [];
  for (const filePath of changedFiles) {
    if (!matchesAny(rule.from, filePath)) {
      continue;
    }
    const absolutePath = path.join(rootDir, filePath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }
    const imports = importsForFile(filePath, fs.readFileSync(absolutePath, 'utf8'));
    for (const reference of imports) {
      if (!reference.resolvable) {
        findings.push({
          id: `${rule.id}:${filePath}:opaque:${reference.kind}:${reference.expressionText}`,
          ruleId: rule.id,
          level: rule.severity ?? 'error',
          message: rule.message,
          evidence: [`${filePath} uses ${reference.kind} with non-literal specifier ${reference.expressionText}; governance cannot prove the target stays outside ${rule.to.join(', ')}.`],
          scope: [filePath]
        });
        continue;
      }
      const resolved = resolveImport(filePath, reference.specifier!, rootDir);
      if (resolved && matchesAny(rule.to, resolved)) {
        findings.push({
          id: `${rule.id}:${filePath}:${resolved}`,
          ruleId: rule.id,
          level: rule.severity ?? 'error',
          message: rule.message,
          evidence: [`${filePath} imports ${reference.specifier} -> ${resolved}`],
          scope: [filePath, resolved]
        });
      }
    }
  }
  return findings;
}

function evaluateRiskRule(rule: RiskBudgetRule, options: GovernanceEvaluationOptions): GovernanceFinding[] {
  const findings: GovernanceFinding[] = [];
  const files = options.changedFiles.filter((filePath) => matchesAny(rule.paths, filePath));
  if (files.length === 0 || !options.run) {
    return findings;
  }
  const changedComplexity = options.run.complexity.filter((item) => files.includes(item.filePath) && item.changed);
  const maxCrap = changedComplexity.reduce((max, item) => Math.max(max, item.crap), 0);
  const mutationSummary = summarizeMutationScore(options.run.mutations.filter((item) => files.includes(item.filePath)));
  const mutationScore = mutationSummary.score;
  if (typeof rule.maxCrap === 'number' && maxCrap > rule.maxCrap) {
    findings.push({
      id: `${rule.id}:crap`,
      ruleId: rule.id,
      level: rule.severity ?? 'error',
      message: rule.message,
      evidence: [`Max changed CRAP ${maxCrap} exceeded budget ${rule.maxCrap}`],
      scope: files
    });
  }
  if (typeof rule.minMutationScore === 'number' && !mutationSummary.measured) {
    findings.push({
      id: `${rule.id}:mutation-missing`,
      ruleId: rule.id,
      level: rule.severity ?? 'error',
      message: rule.message,
      evidence: ['Mutation score unavailable because no killed or surviving mutants were measured for the scoped files.'],
      scope: files
    });
  } else if (typeof rule.minMutationScore === 'number' && mutationScore < rule.minMutationScore) {
    findings.push({
      id: `${rule.id}:mutation`,
      ruleId: rule.id,
      level: rule.severity ?? 'error',
      message: rule.message,
      evidence: [`Mutation score ${mutationScore.toFixed(2)} below budget ${rule.minMutationScore.toFixed(2)}`],
      scope: files
    });
  }
  if (typeof rule.minMergeConfidence === 'number' && options.run.verdict.mergeConfidence < rule.minMergeConfidence) {
    findings.push({
      id: `${rule.id}:confidence`,
      ruleId: rule.id,
      level: rule.severity ?? 'error',
      message: rule.message,
      evidence: [`Merge confidence ${options.run.verdict.mergeConfidence} below minimum ${rule.minMergeConfidence}`],
      scope: files
    });
  }
  return findings;
}

function approvalTargetsRuleOrRun(approval: Approval, ruleId: string, runId?: string): boolean {
  return approval.targetId === ruleId || (runId ? approval.targetId === runId || approval.targetId === `${runId}:${ruleId}` : false);
}

function evaluateApprovalRule(rule: ApprovalRule, options: GovernanceEvaluationOptions): GovernanceFinding[] {
  const files = options.changedFiles.filter((filePath) => matchesAny(rule.paths, filePath));
  if (files.length === 0) {
    return [];
  }
  const runId = options.runId;
  const approvals = options.approvals ?? [];
  const accepted = new Map<string, Approval>();
  for (const approval of approvals) {
    const roleMatches = rule.roles.length === 0 || rule.roles.includes(approval.role ?? '');
    const targetMatches = approvalTargetsRuleOrRun(approval, rule.id, runId);
    if (!roleMatches || !targetMatches || accepted.has(approval.by)) {
      continue;
    }
    accepted.set(approval.by, approval);
  }
  if (accepted.size >= rule.minApprovals) {
    return [];
  }
  return [{
    id: `${rule.id}:approval`,
    ruleId: rule.id,
    level: rule.severity ?? 'error',
    message: rule.message,
    evidence: [`Approvals present ${accepted.size}/${rule.minApprovals}; roles required: ${rule.roles.join(', ') || 'any'}; target must match ${rule.id}${runId ? ` or ${runId}` : ''}`],
    scope: files
  }];
}

function evaluateOwnershipRule(rule: OwnershipRule, options: GovernanceEvaluationOptions): GovernanceFinding[] {
  const files = options.changedFiles.filter((filePath) => matchesAny(rule.paths, filePath));
  if (files.length === 0) {
    return [];
  }
  const approvals = options.approvals ?? [];
  const accepted = new Map<string, Approval>();
  for (const approval of approvals) {
    const targetMatches = approvalTargetsRuleOrRun(approval, rule.id, options.runId);
    const approvedByOwner = approval.by === rule.owner || approval.role === rule.owner || approval.standing === rule.owner;
    const approvedByAllowedAgent = (rule.allowedAgents ?? []).includes(approval.by);
    if (!targetMatches || (!approvedByOwner && !approvedByAllowedAgent) || accepted.has(approval.by)) {
      continue;
    }
    accepted.set(approval.by, approval);
  }
  if (accepted.size > 0) {
    return [];
  }
  return [{
    id: `${rule.id}:ownership`,
    ruleId: rule.id,
    level: rule.severity ?? 'error',
    message: rule.message,
    evidence: [`No ownership approval recorded for owner ${rule.owner}${(rule.allowedAgents ?? []).length > 0 ? ` or allowed agents ${rule.allowedAgents?.join(', ')}` : ''}; target must match ${rule.id}${options.runId ? ` or ${options.runId}` : ''}`],
    scope: files
  }];
}

function evaluateRollbackRule(rule: RollbackRule, options: GovernanceEvaluationOptions): GovernanceFinding[] {
  const files = options.changedFiles.filter((filePath) => matchesAny(rule.paths, filePath));
  if (files.length === 0) {
    return [];
  }
  const claims = new Set(options.attestationsClaims ?? []);
  const missing = rule.requireEvidence.filter((claim) => !claims.has(claim));
  if (missing.length === 0) {
    return [];
  }
  return [{
    id: `${rule.id}:rollback`,
    ruleId: rule.id,
    level: rule.severity ?? 'error',
    message: rule.message,
    evidence: [`Missing required evidence claims: ${missing.join(', ')}`],
    scope: files
  }];
}

export function evaluateGovernance(options: GovernanceEvaluationOptions): GovernanceFinding[] {
  const changedFiles = options.changedFiles.map((item) => normalizePath(item));
  const findings: GovernanceFinding[] = [];
  for (const rule of options.constitution) {
    if (rule.kind === 'boundary') {
      findings.push(...evaluateBoundaryRule(options.rootDir, rule, changedFiles));
    }
    if (rule.kind === 'risk') {
      findings.push(...evaluateRiskRule(rule, { ...options, changedFiles }));
    }
    if (rule.kind === 'approval') {
      findings.push(...evaluateApprovalRule(rule, { ...options, changedFiles }));
    }
    if (rule.kind === 'rollback') {
      findings.push(...evaluateRollbackRule(rule, { ...options, changedFiles }));
    }
    if (rule.kind === 'ownership') {
      findings.push(...evaluateOwnershipRule(rule, { ...options, changedFiles }));
    }
  }
  return findings;
}

export function generateGovernancePlan(run: RunArtifact, constitution: ConstitutionRule[], agents: Agent[]): GovernancePlan {
  const steps: GovernancePlan['steps'] = [];
  const approvalsRequired = constitution.filter((rule) => rule.kind === 'approval' && run.changedFiles.some((filePath) => matchesAny(rule.paths, filePath))) as ApprovalRule[];
  const rollbackRules = constitution.filter((rule) => rule.kind === 'rollback' && run.changedFiles.some((filePath) => matchesAny(rule.paths, filePath))) as RollbackRule[];
  const riskRules = constitution.filter((rule) => rule.kind === 'risk' && run.changedFiles.some((filePath) => matchesAny(rule.paths, filePath))) as RiskBudgetRule[];
  const ownershipRules = constitution.filter((rule) => rule.kind === 'ownership' && run.changedFiles.some((filePath) => matchesAny(rule.paths, filePath))) as OwnershipRule[];

  const survivingMutants = run.mutations.filter((result) => result.status === 'survived');
  if (survivingMutants.length > 0) {
    steps.push({
      type: 'test',
      title: 'Tighten tests around surviving mutants',
      rationale: 'Surviving mutants show behavior that current tests do not constrain.',
      evidence: survivingMutants.map((result) => `${result.filePath}:${result.siteId}`),
      tradeoffs: ['Improves merge confidence', 'May increase test runtime slightly']
    });
  }

  for (const rule of approvalsRequired) {
    const approvers = agents.filter((agent) => agent.kind === 'human' && agent.roles.some((role) => rule.roles.includes(role))).map((agent) => agent.id);
    steps.push({
      type: 'approval',
      title: `Obtain ${rule.minApprovals} approval(s) for ${rule.id}`,
      rationale: rule.message,
      evidence: [`Eligible approvers: ${approvers.join(', ') || 'none configured'}`],
      tradeoffs: ['Slows merge velocity', 'Protects high-sensitivity domains']
    });
  }

  for (const rule of rollbackRules) {
    steps.push({
      type: 'rollback',
      title: `Attach rollback evidence for ${rule.id}`,
      rationale: rule.message,
      evidence: rule.requireEvidence,
      tradeoffs: ['Adds CI or operational work', 'Preserves safe rollback authority']
    });
  }

  for (const rule of riskRules) {
    steps.push({
      type: 'risk',
      title: `Reduce risk budget pressure for ${rule.id}`,
      rationale: rule.message,
      evidence: [
        `Current merge confidence: ${run.verdict.mergeConfidence}`,
        `Current outcome: ${run.verdict.outcome}`
      ],
      tradeoffs: ['May require refactoring or more tests', 'Reduces policy exceptions later']
    });
  }

  for (const rule of ownershipRules) {
    steps.push({
      type: 'ownership',
      title: `Obtain owner approval for ${rule.id}`,
      rationale: rule.message,
      evidence: [`Owner: ${rule.owner}`, ...(rule.allowedAgents ?? []).map((agentId) => `Allowed agent: ${agentId}`)],
      tradeoffs: ['May require owner coordination', 'Preserves path-level accountability']
    });
  }

  const boundaryFindings = run.governance.filter((finding) => constitution.some((rule) => rule.kind === 'boundary' && rule.id === finding.ruleId));
  if (boundaryFindings.length > 0) {
    steps.push({
      type: 'boundary',
      title: 'Remove or isolate forbidden boundary crossings',
      rationale: 'Architectural drift weakens constitutional guarantees over time.',
      evidence: boundaryFindings.flatMap((finding) => finding.evidence),
      tradeoffs: ['May require adapter layers', 'Prevents hidden coupling growth']
    });
  }

  return {
    summary: `Generated ${steps.length} governance step(s) from ${run.governance.length} finding(s) and ${run.mutations.length} mutation result(s).`,
    steps
  };
}
