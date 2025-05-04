import ts, {
	type ImportDeclaration,
	type Node,
	type StringLiteral,
	SyntaxKind,
} from "typescript";

export function getImports(entry: Node): string[] {
	const imports: string[] = [];
	const toWalk = [entry];

	while (toWalk.length > 0) {
		const node = toWalk.shift()!;

		switch (node.kind) {
			case SyntaxKind.ImportDeclaration: {
				const importDecl = node as ImportDeclaration;
				const specifier = importDecl.moduleSpecifier;
				if (ts.isStringLiteral(specifier)) {
					imports.push(specifier.text);
				}
				break;
			}

			case SyntaxKind.ImportKeyword: {
				const parent = node.parent;
				if (ts.isCallExpression(parent) && ts.isStringLiteral(parent.arguments[0]!)) {
					imports.push((parent.arguments[0] as StringLiteral).text);
				}
				break;
			}
		}

		toWalk.push(...node.getChildren());
	}

	return imports;
}

export const getImportsFromSource = (source: string) => getImports(ts.createSourceFile("src.ts", source, ts.ScriptTarget.Latest, true));
