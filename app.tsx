import { render } from 'preact';
import { useEffect, useRef } from 'preact/compat';
import loader from '@monaco-editor/loader';

import { getImportsFromSource } from './tsHelper';

const monaco = await loader.init() as typeof import('monaco-editor');

monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
	paths: {
		"https://*": ['web:*']
	},
	allowNonTsExtensions: true,
	esModuleInterop: true,
	module: monaco.languages.typescript.ModuleKind.ESNext,
	target: monaco.languages.typescript.ScriptTarget.ESNext,
	moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
})

function debounce<T>(func: T, timeout = 300): T {
	let timer: number;
	//@ts-ignore
	return (...args) => {
		clearTimeout(timer);
		//@ts-ignore
		timer = setTimeout(() => func(...args), timeout);
	};
}

const loadedTypes = [] as string[];

async function resolveTypings(source: string) {
	let imports = getImportsFromSource(source)

	imports = imports.filter(v => !loadedTypes.includes(v)).filter(v => {
		try {
			return new URL(v).protocol.startsWith('http');
		} catch {
			return false;
		}
	});

	for (const imp of imports) {
		const tsUrl = await fetch(imp, { method: 'HEAD' }).then(v => v.headers.get('x-typescript-types')!).catch(() => null);
		if (!tsUrl) continue;
		
		const libSource = await fetch(tsUrl).then(v => v.text());
		const alias = 'web:' + imp.split('://')[1] + '/index.d.ts';
		monaco.editor.createModel(libSource, "typescript", monaco.Uri.parse(alias));
		loadedTypes.push(imp);
	}

}

function Monaco() {

	const container = useRef<HTMLDivElement>(null);

	useEffect(() => {

		const editor = monaco.editor.create(container.current!, {
			automaticLayout: true,
			language: 'typescript',
			theme: "vs-dark",
		});

		const eventListener = editor.onDidChangeModelContent(debounce(() => {
			resolveTypings(editor.getValue());
		}));

		return () => {
			eventListener.dispose();
			editor.getModel()?.dispose();
			editor.dispose();
		}

	}, []);

	return <div style={{ width: '100%', height: '100%' }} ref={container} />
}

render(<Monaco />, document.body);