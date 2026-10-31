/** Offline observation harness. Calls the unchanged ProcessorApplication; never AWS. */
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { hashBytes } from './generate-input-integrity-fixtures.mts';

const root = resolve(import.meta.dirname, '..');
const processor = resolve(root, '../3d-processor');
const directory = resolve(root, 'public/examples/input-integrity');
const scratch = await mkdtemp(
  resolve(tmpdir(), 'inspectmesh-input-integrity-'),
);
const project = resolve(scratch, 'Capture.csproj');
const source = `
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using Processor;
using Processor.Reporting;
var root = args[0];
var output = args[1];
var manifest = JsonNode.Parse(File.ReadAllText(Path.Combine(output, "manifest.json")))!;
var app = new ProcessorApplication();
var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = true };
var records = new List<object>();
foreach (var entry in manifest["entries"]!.AsArray().Concat(manifest["reused"]!.AsArray()))
{
    var relative = entry!["path"]!.GetValue<string>();
    var path = Path.Combine(root, "public", relative.TrimStart('/'));
    try
    {
        var report = app.Process(path, Path.GetFileName(path));
        records.Add(new { path = relative, accepted = true, surfaceValidationRan = true, report });
    }
    catch (Exception exception)
    {
        records.Add(new { path = relative, accepted = false, surfaceValidationRan = false, message = exception.Message });
    }
}
var repairs = new List<object>();
foreach (var name in new[] { "cube-repeated-position", "cube-collinear" })
{
    var input = Path.Combine(output, name + ".stl");
    var saved = Path.Combine(output, name + "-cleaned.stl");
    var report = app.RepairStl(input, Path.GetFileName(input), saved);
    var bytes = File.ReadAllBytes(saved);
    repairs.Add(new { input = "/examples/input-integrity/" + name + ".stl", output = "/examples/input-integrity/" + name + "-cleaned.stl", bytes = bytes.Length, sha256 = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant(), report });
}
File.WriteAllText(Path.Combine(output, "processor-capture.json"), JsonSerializer.Serialize(new { observations = records, repairs }, options));
`;
try {
  const reference = resolve(processor, 'src/Processor/Processor.csproj')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;');
  await writeFile(
    project,
    `<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net10.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable></PropertyGroup><ItemGroup><ProjectReference Include="${reference}" /></ItemGroup></Project>`,
  );
  await writeFile(resolve(scratch, 'Program.cs'), source);
  execFileSync(
    'dotnet',
    [
      'build',
      project,
      '--nologo',
      '--disable-build-servers',
      '-m:1',
      '-v:q',
      '-p:NuGetAudit=false',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  execFileSync(
    'dotnet',
    [resolve(scratch, 'bin/Debug/net10.0/Capture.dll'), root, directory],
    { cwd: root, stdio: 'inherit' },
  );
  const capturePath = resolve(directory, 'processor-capture.json');
  const capture: unknown = JSON.parse(await readFile(capturePath, 'utf8'));
  const implementations = [];
  for (const file of [
    'src/Processor/ProcessorApplication.cs',
    'src/Processor/Stl/StlReader.cs',
    'src/Processor/Stl/StlSafeRepairer.cs',
    'src/Processor/Validation/MeshValidator.cs',
    'src/Processor/Reporting/MeshQualityReportBuilder.cs',
  ]) {
    implementations.push({
      file,
      sha256: hashBytes(await readFile(resolve(processor, file))),
    });
  }
  await writeFile(
    resolve(directory, 'processor-observations.json'),
    JSON.stringify(
      {
        formatVersion: 1,
        observedDate: new Date().toISOString().slice(0, 10),
        processorRevision: execFileSync('git', ['rev-parse', 'HEAD'], {
          cwd: processor,
          encoding: 'utf8',
        }).trim(),
        dotnet: execFileSync('dotnet', ['--version'], {
          encoding: 'utf8',
        }).trim(),
        harness: 'scripts/capture-input-integrity-processor.mts',
        harnessSha256: hashBytes(await readFile(new URL(import.meta.url))),
        reproduction:
          'node --experimental-strip-types scripts/capture-input-integrity-processor.mts',
        method:
          'Local unchanged ProcessorApplication.Process and RepairStl, followed by reparse of saved bytes through Process. The same processor methods serve checker/cleanup jobs. No deployed endpoint, browser upload, slicer or physical print was used.',
        implementations,
        capture,
      },
      null,
      2,
    ) + '\n',
  );
  await rm(capturePath);
  console.log(
    'Captured actual local processor validation and complete cleanup reports.',
  );
} finally {
  await rm(scratch, { recursive: true, force: true });
}
