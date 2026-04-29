# SygnumPCFComponents — Solution Packaging Guide

## Golden Rule

**The managed solution must ALWAYS contain ALL controls.** Importing a managed solution that is missing a control will DELETE that control from D365. Never remove a control from the manifest to "scope" or "simplify" an import — this destroys existing controls in the target environment.

## Current Controls (10 total)

| # | SchemaName | Description |
|---|-----------|-------------|
| 1 | Syg.EddFindingsViewer | EDD Finding records as expandable cards |
| 2 | Syg.AssociationCards | Association/relationship card view |
| 3 | Syg.CompactSubgrid | Generic condensed subgrid with detail panel |
| 4 | Syg.WealthAllocationControl | Visual wealth distribution across asset classes |
| 5 | Syg.ComplianceConditionScheduler | Guided wizard for compliance condition scheduling |
| 6 | Syg.KycDraftTakeover | AI research output review and takeover |
| 7 | Syg.OnboardingApprovalTracker | Approval progress tracker for client onboarding |
| 8 | Syg.NpOnboardingChecklist | 4-eyes onboarding verification checklist |
| 9 | Syg.RichTextMemo | Auto-linking multiline text field |
| 10 | Syg.ChoicePillButtons | Pill-style buttons for OptionSet fields |

When an 11th control is added, update this list, `solution.xml`, and `customizations.xml`.

## Solution structure

```
Solution/manual-pack/
├── [Content_Types].xml          # Declares xml, js, resx extensions
├── solution.xml                 # Version, publisher, RootComponents (ALL controls)
├── customizations.xml           # CustomControl entries (ALL controls)
└── Controls/
    ├── Syg.EddFindingsViewer/
    │   ├── ControlManifest.xml  # Compiled manifest (from out/controls/)
    │   └── bundle.js            # Production bundle (from out/controls/)
    ├── Syg.AssociationCards/
    │   ├── ControlManifest.xml
    │   ├── bundle.js
    │   └── strings/AssociationCards.1033.resx
    ├── ... (same pattern for each control)
    └── Syg.NpOnboardingChecklist/
        ├── ControlManifest.xml
        └── bundle.js
```

## How to build a new version

### Step 1: Build the control(s) that changed

```bash
cd <ControlName>/
npm install          # only if node_modules missing
npm run build        # runs: pcf-scripts build --buildMode production
```

This produces `out/controls/bundle.js` and `out/controls/ControlManifest.xml`.

### Step 2: Copy compiled output to manual-pack

```bash
cp <ControlName>/out/controls/bundle.js Solution/manual-pack/Controls/Syg.<ControlName>/bundle.js
cp <ControlName>/out/controls/ControlManifest.xml Solution/manual-pack/Controls/Syg.<ControlName>/ControlManifest.xml
```

**Important:** Copy `ControlManifest.xml` from `out/controls/`, NOT from the source `ControlManifest.Input.xml`. The build process compiles `index.ts` → `bundle.js` and rewrites the manifest path accordingly.

### Step 3: Bump solution version

Edit `Solution/manual-pack/solution.xml` and increment `<Version>`:

```xml
<Version>8.0.22</Version>   <!-- was 8.0.21 -->
```

### Step 4: Verify all 8 controls are registered

Check that `solution.xml` has 8 `<RootComponent>` entries and `customizations.xml` has 8 `<CustomControl>` entries. If any are missing, the import will silently remove them from D365.

```bash
grep -c "RootComponent type=" Solution/manual-pack/solution.xml    # must be 10
grep -c "<Name>" Solution/manual-pack/customizations.xml            # must be 10
ls Solution/manual-pack/Controls/ | wc -l                           # must be 10
```

### Step 5: Create the zip

**macOS / Linux:**
```bash
cd Solution/manual-pack
zip -r ../bin/Release/SygnumPCFComponents_<version>.zip . -x "*.DS_Store"
```

**Windows (PowerShell):**
```powershell
cd Solution\manual-pack
# DO NOT use Compress-Archive or ZipFile::CreateFromDirectory — both create backslash
# paths on Windows that break D365 import. Use ZipArchive with explicit forward slashes:
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$srcDir = (Resolve-Path .).Path
$dst = (Resolve-Path ..\bin\Release).Path + "\SygnumPCFComponents_<version>.zip"
if (Test-Path $dst) { Remove-Item $dst }
$stream = [System.IO.File]::Open($dst, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)
Get-ChildItem -Path $srcDir -Recurse -File | ForEach-Object {
    $entryName = $_.FullName.Substring($srcDir.Length + 1).Replace('\', '/')
    $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $entry.Open()
    $fileStream = [System.IO.File]::OpenRead($_.FullName)
    $fileStream.CopyTo($entryStream)
    $fileStream.Close()
    $entryStream.Close()
}
$archive.Dispose()
$stream.Close()
```

Or if 7-Zip is installed:
```powershell
cd Solution\manual-pack
7z a -tzip ..\bin\Release\SygnumPCFComponents_<version>.zip *
```

**Why not `Compress-Archive`?** It stores paths with backslashes (`Controls\Syg.Foo\bundle.js`) which don't match the forward-slash references in `customizations.xml`, causing D365 import to fail silently.

### Step 6: Verify the zip

```bash
# Check forward slashes
unzip -l ../bin/Release/SygnumPCFComponents_<version>.zip | head -10

# Check version
unzip -p ../bin/Release/SygnumPCFComponents_<version>.zip solution.xml | grep "<Version>"

# Check all 8 RootComponents
unzip -p ../bin/Release/SygnumPCFComponents_<version>.zip solution.xml | grep -c "RootComponent type="
```

## Common mistakes to avoid

| Mistake | Consequence |
|---------|------------|
| Remove a control from solution.xml to "scope" the update | That control gets DELETED from D365 |
| Build zip on Windows with PowerShell/Compress-Archive | Backslash paths → import fails |
| Copy `ControlManifest.Input.xml` instead of compiled `ControlManifest.xml` | Manifest references `index.ts` instead of `bundle.js` → control won't load |
| Forget `<uses-feature name="WebAPI">` in manifest | `context.webAPI.retrieveRecord` throws at runtime |
| Use `platform-library` in manifest | Breaks on macOS builds, blocked by Solution Checker |
| Use Fluent UI v9 | D365 runtime crashes |
| Hardcode entity names (e.g. `/incidents`) | Use `context.mode.contextInfo.entityTypeName` — entity is `syg_servicerequest`, not `incident` |

## Adding a new control

1. Create the control folder, build it
2. Copy `bundle.js` + `ControlManifest.xml` to `Solution/manual-pack/Controls/Syg.<NewControl>/`
3. Add `<RootComponent type="66" schemaName="Syg.<NewControl>" behavior="0" />` to `solution.xml`
4. Add `<CustomControl><Name>Syg.<NewControl></Name><FileName>/Controls/Syg.<NewControl>/ControlManifest.xml</FileName></CustomControl>` to `customizations.xml`
5. If control has `.resx` files, include them in the control folder
6. Bump version, rebuild zip
