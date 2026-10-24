import ts from "typescript";
import { readFileSync, writeFileSync } from "node:fs";
const file = ts.findConfigFile(
  process.cwd(),
  ts.sys.fileExists,
  "tsconfig.json",
);
const config = ts.parseJsonConfigFileContent(
  ts.readConfigFile(file, ts.sys.readFile).config,
  ts.sys,
  process.cwd(),
);
const service = ts.createLanguageService({
  getScriptFileNames: () => config.fileNames,
  getScriptVersion: () => "0",
  getScriptSnapshot: (name) =>
    ts.sys.fileExists(name)
      ? ts.ScriptSnapshot.fromString(ts.sys.readFile(name))
      : undefined,
  getCurrentDirectory: () => process.cwd(),
  getCompilationSettings: () => config.options,
  getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
});
for (const name of config.fileNames.filter(
  (x) => x.includes("/src/") || x.includes("/app/"),
)) {
  const edits = service.organizeImports(
    { type: "file", fileName: name },
    {},
    {},
  );
  for (const edit of edits) {
    let content = readFileSync(edit.fileName, "utf8");
    for (const change of [...edit.textChanges].sort(
      (a, b) => b.span.start - a.span.start,
    ))
      content =
        content.slice(0, change.span.start) +
        change.newText +
        content.slice(change.span.start + change.span.length);
    writeFileSync(edit.fileName, content);
  }
}
service.dispose();
