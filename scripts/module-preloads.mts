import ts from 'typescript';

// Follow only static imports from modules this document already requests.
// Dynamic route imports must remain lazy, including the large mesh tools.
export function createModulePreloadCompleter(
  readModule: (filename: string) => Promise<string>,
): (html: string) => Promise<string> {
  const imports = new Map<string, Promise<string[]>>();

  function localFilename(url: string): string | undefined {
    return /^(?:\.\/|\/)?[\w.-]+\.js$/.test(url)
      ? url.replace(/^(?:\.\/|\/)/, '')
      : undefined;
  }

  function dependencies(filename: string): Promise<string[]> {
    let result = imports.get(filename);
    if (!result) {
      result = readModule(filename).then((source) => {
        const ast = ts.createSourceFile(
          filename,
          source,
          ts.ScriptTarget.Latest,
          false,
          ts.ScriptKind.JS,
        );
        const names: string[] = [];
        for (const statement of ast.statements) {
          if (
            (ts.isImportDeclaration(statement) ||
              ts.isExportDeclaration(statement)) &&
            statement.moduleSpecifier &&
            ts.isStringLiteral(statement.moduleSpecifier)
          ) {
            const specifier = statement.moduleSpecifier.text;
            const dependency = specifier.startsWith('./')
              ? localFilename(specifier)
              : undefined;
            if (dependency) {
              names.push(dependency);
            }
          }
        }
        return names;
      });
      imports.set(filename, result);
    }
    return result;
  }

  return async (html) => {
    const existing = new Set<string>();
    const roots = new Set<string>();
    for (const [tag] of html.matchAll(/<(?:link|script)\b[^>]*>/g)) {
      if (tag.startsWith('<link') && /\brel="modulepreload"/.test(tag)) {
        const filename = localFilename(/\bhref="([^"]+)"/.exec(tag)?.[1] ?? '');
        if (filename) {
          existing.add(filename);
          roots.add(filename);
        }
      } else if (tag.startsWith('<script') && /\btype="module"/.test(tag)) {
        const filename = localFilename(/\bsrc="([^"]+)"/.exec(tag)?.[1] ?? '');
        if (filename) {
          roots.add(filename);
        }
      }
    }
    const visited = new Set(roots);
    const missing = new Set<string>();
    for (const filename of visited) {
      for (const dependency of await dependencies(filename)) {
        if (!existing.has(dependency) && !roots.has(dependency)) {
          missing.add(dependency);
        }
        visited.add(dependency);
      }
    }
    const hints = [...missing]
      .sort()
      .map((filename) => `<link rel="modulepreload" href="${filename}">`)
      .join('');
    return hints ? html.replace('</head>', `${hints}</head>`) : html;
  };
}
