import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { guideSlugs } from '../src/app/features/guides/generated/guide-route-data.generated.ts';

export interface RegisteredRoute {
  readonly path: string;
  readonly source: string;
  readonly renderer: string;
}
export interface RouterDiscovery {
  readonly routes: RegisteredRoute[];
  readonly patterns: { path: string; source: string; reason: string }[];
}
const dataFiles = new Set([
  'src/app/core/seo/public-routes.ts',
  'src/app/features/planning/planner-kind.ts',
  'src/app/features/materials/material-catalogue.ts',
  'src/app/features/materials/material-evidence.ts',
  'src/app/features/materials/material-comparisons.ts',
  'src/app/features/printer-comparison/printer-catalogue.ts',
  'src/app/features/printer-comparison/comparison-catalogue.ts',
]);
const root = resolve(import.meta.dirname, '..');
const dataCache = new Map<string, Record<string, unknown>>();

/** Only these pure catalogue modules may execute; Angular/component modules never do. */
function loadData(file: string): Record<string, unknown> {
  const relative = file.slice(root.length + 1).replaceAll('\\', '/');
  if (!dataFiles.has(relative)) {
    throw new Error(
      `Unresolved router data module: ${file}. Add an explicit safe resolver; do not skip it.`,
    );
  }
  const prior = dataCache.get(file);
  if (prior) {
    return prior;
  }
  const exports: Record<string, unknown> = {};
  dataCache.set(file, exports);
  const dataAst = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  // ES imports are hoisted even when authored below their first use.
  const ordered = [
    ...dataAst.statements.filter(ts.isImportDeclaration),
    ...dataAst.statements.filter((node) => !ts.isImportDeclaration(node)),
  ]
    .map((node) => node.getFullText(dataAst))
    .join('\n');
  const code = ts.transpileModule(ordered, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
  }).outputText;
  runInNewContext(
    code,
    {
      exports,
      require: (specifier: string) =>
        loadData(resolve(dirname(file), specifier + '.ts')),
    },
    { filename: file, timeout: 2000 },
  );
  return exports;
}

export function discoverRouter(
  source = readFileSync(resolve(root, 'src/app/app.routes.ts'), 'utf8'),
  file = resolve(root, 'src/app/app.routes.ts'),
  readSource: (file: string) => string = (path) => readFileSync(path, 'utf8'),
): RouterDiscovery {
  const result: RouterDiscovery = { routes: [], patterns: [] };
  const reading = new Set<string>();
  function readRoutes(
    text: string,
    filePath: string,
    exportName: string,
  ): unknown {
    const identity = filePath + ':' + exportName;
    if (reading.has(identity)) {
      throw new Error(`Cyclic lazy route source: ${identity}`);
    }
    reading.add(identity);
    const ast = ts.createSourceFile(
      filePath,
      text,
      ts.ScriptTarget.Latest,
      true,
    );
    const declarations = new Map<string, ts.Expression>();
    const imports = new Map<string, { file: string; name: string }>();
    for (const statement of ast.statements) {
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name) && declaration.initializer) {
            declarations.set(declaration.name.text, declaration.initializer);
          }
        }
      }
      if (
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        const bindings = statement.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const binding of bindings.elements) {
            imports.set(binding.name.text, {
              file: resolve(
                dirname(filePath),
                statement.moduleSpecifier.text + '.ts',
              ),
              name: binding.propertyName?.text ?? binding.name.text,
            });
          }
        }
      }
    }
    const resolving = new Set<string>();
    function fail(node: ts.Node): never {
      throw new Error(
        `Unresolved router expression at ${filePath}:${ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1}: ${node.getText(ast)}`,
      );
    }
    function bind(
      name: ts.BindingName,
      value: unknown,
      env: Record<string, unknown>,
    ): void {
      if (ts.isIdentifier(name)) {
        env[name.text] = value;
      } else if (ts.isArrayBindingPattern(name) && Array.isArray(value)) {
        name.elements.forEach((element, index) => {
          if (ts.isBindingElement(element)) {
            bind(element.name, value[index], env);
          }
        });
      } else {
        fail(name);
      }
    }
    function evaluate(
      node: ts.Expression,
      env: Record<string, unknown> = {},
    ): unknown {
      if (
        ts.isParenthesizedExpression(node) ||
        ts.isAsExpression(node) ||
        ts.isSatisfiesExpression(node)
      ) {
        return evaluate(node.expression, env);
      }
      if (ts.isStringLiteralLike(node)) {
        return node.text;
      }
      if (
        node.kind === ts.SyntaxKind.FalseKeyword ||
        node.kind === ts.SyntaxKind.TrueKeyword
      ) {
        return node.kind === ts.SyntaxKind.TrueKeyword;
      }
      if (ts.isIdentifier(node)) {
        if (Object.hasOwn(env, node.text)) {
          return env[node.text];
        }
        const declaration = declarations.get(node.text);
        if (declaration && !resolving.has(node.text)) {
          resolving.add(node.text);
          const value = evaluate(declaration, env);
          resolving.delete(node.text);
          return value;
        }
        const imported = imports.get(node.text);
        if (imported) {
          return loadData(imported.file)[imported.name];
        }
        return fail(node);
      }
      if (ts.isPropertyAccessExpression(node)) {
        const object = evaluate(node.expression, env);
        if (
          object &&
          typeof object === 'object' &&
          Object.hasOwn(object, node.name.text)
        ) {
          return (object as Record<string, unknown>)[node.name.text];
        }
        return fail(node);
      }
      if (ts.isTemplateExpression(node)) {
        return (
          node.head.text +
          node.templateSpans
            .map(
              (span) =>
                String(evaluate(span.expression, env)) + span.literal.text,
            )
            .join('')
        );
      }
      if (ts.isArrayLiteralExpression(node)) {
        return node.elements.flatMap((item) => {
          if (ts.isSpreadElement(item)) {
            const value = evaluate(item.expression, env);
            if (!Array.isArray(value)) {
              return fail(item);
            }
            return value;
          }
          return [evaluate(item, env)];
        });
      }
      if (ts.isObjectLiteralExpression(node)) {
        const value: Record<string, unknown> = {
          source: `${filePath}:${ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1}`,
        };
        for (const prop of node.properties) {
          if (ts.isShorthandPropertyAssignment(prop)) {
            value[prop.name.text] = evaluate(prop.name, env);
            continue;
          }
          if (!ts.isPropertyAssignment(prop)) {
            return fail(prop);
          }
          const name = prop.name.getText(ast).replace(/^['"]|['"]$/g, '');
          if (['path', 'children', 'redirectTo', 'pathMatch'].includes(name)) {
            value[name] = evaluate(prop.initializer, env);
          } else if (['loadComponent', 'component'].includes(name)) {
            value['renderer'] = prop.initializer.getText(ast);
          } else if (name === 'loadChildren') {
            const expression = prop.initializer.getText(ast);
            const match = expression.match(
              /^\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)\.then\(\(?\w+\)?\s*=>\s*\w+\.(\w+)\s*\)$/,
            );
            if (!match) {
              return fail(prop);
            }
            const childFile = resolve(dirname(filePath), match[1] + '.ts');
            value['children'] = readRoutes(
              readSource(childFile),
              childFile,
              match[2],
            );
          } else if (name === 'canMatch') {
            value['canMatch'] = prop.initializer
              .getText(ast)
              .replace(/\s/g, '');
          } else if (name === 'matcher') {
            return fail(prop);
          }
        }
        return value;
      }
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression)
      ) {
        const list = evaluate(node.expression.expression, env);
        const operation = node.expression.name.text;
        const callback = node.arguments[0];
        if (
          !Array.isArray(list) ||
          !callback ||
          !ts.isArrowFunction(callback) ||
          ts.isBlock(callback.body) ||
          !['map', 'filter'].includes(operation)
        ) {
          return fail(node);
        }
        const apply = (value: unknown) => {
          const scope = { ...env };
          bind(callback.parameters[0].name, value, scope);
          return evaluate(callback.body as ts.Expression, scope);
        };
        return operation === 'map' ? list.map(apply) : list.filter(apply);
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken
      ) {
        return evaluate(node.left, env) !== evaluate(node.right, env);
      }
      return fail(node);
    }
    const declaration = declarations.get(exportName);
    if (!declaration) {
      throw new Error(`Missing router export ${exportName} in ${filePath}`);
    }
    const value = evaluate(declaration);
    reading.delete(identity);
    return value;
  }
  function collect(value: unknown, parent: string): void {
    if (!Array.isArray(value)) {
      throw new Error('Router source did not resolve to an array.');
    }
    for (const item of value as Record<string, unknown>[]) {
      if (typeof item['path'] !== 'string') {
        throw new Error(
          `Route has no resolved path at ${String(item['source'])}`,
        );
      }
      const path =
        '/' +
        [parent, item['path']].filter(Boolean).join('/').replace(/^\/+/, '');
      const source = String(item['source']);
      if (
        item['path'] === ':guideSlug' ||
        item['path'] === 'guides/:guideSlug'
      ) {
        if (item['canMatch'] !== '[guideCanMatch]') {
          throw new Error(`Unresolved guide route guard at ${source}`);
        }
        result.routes.push(
          ...guideSlugs.map((slug) => ({
            path:
              '/' +
              [parent, String(item['path']).replace(':guideSlug', slug)]
                .filter(Boolean)
                .join('/')
                .replace(/^\/+/, ''),
            source,
            renderer: String(item['renderer']),
          })),
        );
        result.patterns.push({
          path,
          source,
          reason:
            'guideCanMatch finite published guideSlugs; unpublished/disabled slugs are not matches.',
        });
      } else if (item['path'] === '**') {
        result.patterns.push({
          path,
          source,
          reason:
            'NotFoundPage wildcard; verify unknown URL transport status independently.',
        });
      } else if (/[:*]/.test(path)) {
        throw new Error(`Unresolved dynamic router path ${path} at ${source}`);
      } else {
        // A layout with children is not a second concrete empty-path page.
        if (!item['children']) {
          result.routes.push({
            path,
            source,
            renderer: String(
              item['renderer'] ??
                (item['redirectTo'] === undefined
                  ? 'componentless'
                  : `redirect:${String(item['redirectTo'])}`),
            ),
          });
        }
      }
      if (item['children']) {
        collect(item['children'], path === '/' ? '' : path);
      }
    }
  }
  collect(readRoutes(source, file, 'routes'), '');
  return result;
}
