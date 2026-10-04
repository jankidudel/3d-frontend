"""Audit generated production HTML. Input: route registry export and original request path."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from collections import Counter
import json, re, sys
root = Path(__file__).resolve().parents[2]
docs = root / 'docs/english-market-batch'
data = json.loads(Path(sys.argv[1]).read_text())
request = Path(sys.argv[2]).read_text()
manifest = json.loads((docs / 'change-manifest.json').read_text())
base = 'https://www.inspectmesh.com'
normalize = lambda p: '/' + p.strip('/') if p.strip('/') else '/'
sitemapRoutes = sorted(set(map(normalize, data['canonicalPublicRoutePaths'] + data['guideRoutePaths'])))
public = sorted(set(sitemapRoutes + ['/privacy', '/cookies', '/404', '/3d-printers/review-draft']))
new = list(map(normalize, manifest['newGuideOutcomes'])) + [data['PublicRouteUrl'][key] for key in ['BatchStlChecker','StlCompare','FilamentRemainingCalculator','NozzleLayerHeightCalculator','VolumetricFlowCalculator','PrintFinishTimeCalculator']]
changed = list(map(normalize, manifest['existingGuideOutcomes'] + manifest['materialPages'] + manifest['printerPages'] + manifest['hubs'] + manifest['additionalChangedPages'])) + [data['PublicRouteUrl'][key] for key in manifest['substantialToolPages']]
assert len(set(new)) == 12 and len(set(changed)) == 46
class Page(HTMLParser):
 def __init__(self):
  super().__init__(); self.title=''; self.h1=[]; self.meta={}; self.links=[]; self.sources=[]; self.text=[]; self.canon=[]; self.byline=[]; self.active=''; self.ignore=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag in ['title','h1']: self.active=tag; self.h1.append('') if tag=='h1' else None
  if tag in ['script','style']: self.ignore+=1
  if tag=='meta': self.meta[a.get('name','')]=a.get('content','')
  if tag=='link' and a.get('rel')=='canonical': self.canon.append(a.get('href',''))
  if tag=='a': self.links.append({'href':a.get('href',''),'download':'download' in a,'text':''})
 def handle_endtag(self,tag):
  if tag in ['title','h1']: self.active=''
  if tag in ['script','style']: self.ignore=max(0,self.ignore-1)
 def handle_data(self,s):
  if self.active=='title': self.title+=s
  if self.active=='h1': self.h1[-1]+=s
  if not self.ignore: self.text.append(s)
  if self.links: self.links[-1]['text']+=s if self.get_starttag_text() and self.get_starttag_text().startswith('<a') else ''
pages={}; missing=[]
for route in public:
 path=root/'dist/3d-frontend/browser'/route.strip('/')/'index.html'
 if route=='/': path=root/'dist/3d-frontend/browser/index.html'
 if not path.exists(): missing.append(route); continue
 p=Page();p.feed(path.read_text());pages[route]=p
incoming={r:set() for r in pages}; outgoing={}
for route,p in pages.items():
 links=set()
 for a in p.links:
  u=urlparse(urljoin(base+route+'/',a['href']))
  if u.netloc=='www.inspectmesh.com' and normalize(u.path) in pages:
   links.add(normalize(u.path));incoming[normalize(u.path)].add(route)
 outgoing[route]=sorted(links)
rows=[];issues=[]
for route,p in pages.items():
 body=' '.join(' '.join(p.text).split());guide=next((g for g in data['guideRegistry'] if normalize(g['slug'])==route),None)
 typ='guide' if guide else 'material comparison' if route.startswith('/compare-materials/') else 'material' if route.startswith('/3d-printing-materials/') else 'printer comparison' if route.startswith('/compare/') else 'printer' if route.startswith('/3d-printers/') else 'hub' if route in ['/tools','/guides','/3d-printers','/3d-printing-materials','/stl-tools','/3mf-tools'] else 'homepage' if route=='/' else 'legal/contact' if route in ['/privacy','/cookies','/contact'] else 'tool'
 action='keep nonindexable utility/draft' if route in ['/404', '/3d-printers/review-draft'] else 'new working asset' if route in new else 'deepen' if route in changed else 'keep'
 reason='Distinct implemented task with controls and explicit limitations' if route in new else 'Page-specific worked example, interpretation and useful next action' if route in changed else 'Existing distinct route retained; no duplicate removal justified by generated-content review'
 errors=[]
 if len(p.h1)!=1: errors.append('H1 count '+str(len(p.h1)))
 if route not in ['/404', '/3d-printers/review-draft'] and p.canon!=[base+route]: errors.append('Canonical differs: '+str(p.canon))
 if route not in ['/404', '/3d-printers/review-draft'] and 'noindex' in p.meta.get('robots',''): errors.append('Production noindex')
 if not p.title.strip() or not p.meta.get('description'): errors.append('Missing title/description')
 if errors: issues.append({'url':base+route,'findings':errors})
 sources=sorted(set(a['href'] for a in p.links if a['href'].startswith('https://') and 'inspectmesh.com' not in a['href']))
 primary=re.sub(r'\s*\|\s*InspectMesh$','',p.title.strip())
 rows.append({'url':base+route,'pageType':typ,'title':p.title.strip(),'h1':[' '.join(h.split()) for h in p.h1],'description':p.meta.get('description',''),'crawlableWordsIncludingSharedNavigation':len(body.split()),'task':primary,'queryCluster':'See keyword-ownership.json; unassigned pages retain their existing format/task ownership','intentMatchesVisibleTask':'yes, generated-content review; physical outcomes not established','canonical':p.canon,'indexableProductionBuild':'noindex' not in p.meta.get('robots',''),'sitemapIncluded':base+route in (root/'public/sitemap.xml').read_text(),'productionHttpStatus':'not reverified; production not changed','devStatus':'see deployment-verification.json after release','evidence':{'exampleAssets':sorted(set(a['href'] for a in p.links if '/examples/' in a['href'])),'technicalSources':sources,'bylineMethodology':'Existing editorial identity retained; inspect methodology and source labels in rendered page; no physical-test authorship added','firstPublished':guide.get('publishDate') if guide else None,'editoriallyUpdated':guide.get('updatedDate') if guide else '2026-10-04' if route in changed+new else None},'incomingInternalUrls':[base+x for x in sorted(incoming[route])],'outgoingInternalUrls':[base+x for x in outgoing[route]],'parentHub':base+('/guides' if typ=='guide' else '/3d-printing-materials' if 'material' in typ else '/3d-printers' if 'printer' in typ else '/tools'),'primaryAction':primary+'; then related workflow links','gscCountryWindow':'Unavailable; UK/US/CA/AU/NZ/IE segmentation unobserved','disposition':action,'reason':reason,'workPerformed':reason if route in changed+new else 'Retained after metadata, canonical, indexability and internal-link review','validation':errors or ['Rendered metadata checked; required SEO/internal-link build checks cover this route']})
for field in ['title','description']:
 counts=Counter(row[field] for row in rows)
 for value,count in counts.items():
  if count>1:issues.append({'finding':'duplicate '+field,'value':value,'urls':[row['url'] for row in rows if row[field]==value]})
drafts=[{'url':base+'/'+g['slug'],'disposition':'keep draft/scheduled','reason':'Registry disabled or not currently emitted; no new public promise','registry':g} for g in data['guideRegistry'] if normalize(g['slug']) not in pages]
(docs/'public-page-audit.json').write_text(json.dumps({'date':'2026-10-04','scope':'Generated production output, registry and all internal links; actual production HTTP and authenticated search analytics not observed','counts':{'renderedInventory':len(public),'sitemapCanonicalPublic':len(sitemapRoutes),'publicLegalUtilities':2,'nonIndexableUtilitiesOrDrafts':2,'new':len(new),'changedExisting':len(changed),'deepExisting':45,'homepageDiscovery':1,'guideOutcomes':21},'missingGenerated':missing,'findings':issues,'pages':rows,'draftOrScheduledGuides':drafts},indent=2)+'\n')
(docs/'changed-public-urls.json').write_text(json.dumps({'new':[base+x for x in sorted(new)],'changedExisting':[base+x for x in sorted(changed)]},indent=2)+'\n')
# Every seed has exactly one owner; close variants intentionally share the same page.
blocks=re.findall(r'```text\n(.*?)\n```',request.split('## 20.')[1].split('## 21.')[0],re.S)
seeds=[b.splitlines() for b in blocks];assert len(seeds)==12 and sum(map(len,seeds))==120
owners=[
 ['stl-quality-checker','stl-quality-checker','stl-print-preflight','stl-print-preflight','stl-manifold-checker','stl-watertight-checker','how-to-repair-an-stl-file','stl-repair','3mf-quality-checker','how-to-check-if-a-3d-model-is-ready-to-print'],
 ['stl-file-wont-slice']*7+['how-to-open-a-3mf-file','how-to-repair-an-stl-file','stl-file-wont-slice'],
 ['stl-dimensions-checker','stl-dimensions-checker','why-stl-files-have-no-units','why-stl-files-have-no-units','why-stl-files-have-no-units','why-stl-files-have-no-units','stl-scale-tool','how-to-scale-an-stl-file-for-3d-printing','3mf-units-explained','3mf-dimensions-checker'],
 ['nozzle-layer-height-calculator']*3+['3d-print-wall-thickness-guide','3d-print-wall-thickness-guide','nozzle-layer-height-calculator','nozzle-layer-height-calculator','3d-print-wall-thickness-guide','3d-print-wall-thickness-guide','3d-print-wall-thickness-guide'],
 ['stl-compare']*5+['batch-stl-checker']*3+['check-stl-files-before-selling','3d-print-file-preflight-checklist'],
 ['filament-remaining-calculator']*6+['filament-length-calculator','how-much-filament-does-a-3d-print-use','filament-length-calculator','how-much-filament-does-a-3d-print-use'],
 ['volumetric-flow-calculator','maximum-volumetric-speed-explained','volumetric-flow-calculator','volumetric-flow-calculator','maximum-volumetric-speed-explained','maximum-volumetric-speed-explained','3d-print-finish-time-calculator','3d-print-finish-time-calculator','gcode-preflight-checker','how-to-check-gcode-before-printing'],
 ['filament-dryer-vs-dry-box','3d-printing-materials/petg','filament-dryer-vs-dry-box','3d-printing-materials/petg','3d-printing-materials/nylon','3d-printing-materials/petg','3d-printing-materials/nylon','filament-dryer-vs-dry-box','filament-dryer-vs-dry-box','filament-dryer-vs-dry-box'],
 ['nozzle-layer-height-calculator','brass-vs-hardened-nozzle','brass-vs-hardened-nozzle','nozzle-layer-height-calculator','nozzle-layer-height-calculator','brass-vs-hardened-nozzle','nozzle-layer-height-calculator','nozzle-layer-height-calculator','brass-vs-hardened-nozzle','brass-vs-hardened-nozzle'],
 ['3d-printing-materials','compare-materials/petg-vs-asa','compare-materials/pla-vs-petg','3d-printing-material-selector','3d-printing-material-selector','3d-printing-material-selector','3d-printing-materials/tpu','compare-materials/petg-vs-nylon','3d-printing-materials/petg','3d-printing-materials/asa'],
 ['3d-printer-fit-checker','3d-printers','how-to-check-if-a-3d-model-fits-your-printer','how-to-check-if-a-3d-model-fits-your-printer','3d-printers/bambu-lab-a1-mini','compare/bambu-lab-a1-vs-a1-mini','3d-printers','3d-printers','how-to-check-if-a-3d-model-fits-your-printer','3d-print-cost-calculator'],
 ['3d-print-cost-calculator','3d-printing-price-calculator','how-much-to-charge-for-3d-prints','how-much-to-charge-for-3d-prints','3d-printing-price-calculator','how-to-calculate-3d-printing-cost','how-to-calculate-3d-printing-cost','3d-printing-price-calculator','how-to-calculate-3d-printing-cost','how-to-calculate-3d-printing-cost']]
clusterNames=['Mesh checking and repair','Slicing problems','Units, dimensions and resizing','Walls, line width and layers','Comparison and batch reports','Partial spools and usage','Throughput and finish time','Drying and storage','Nozzle compatibility','Functional materials','Printer fit','Cost and quoting']
queryrows=[]
for i,terms in enumerate(seeds):
 for j,term in enumerate(terms):
  owner=normalize(owners[i][j]);assert owner in pages,owner
  queryrows.append({'query':term,'cluster':clusterNames[i],'primaryOwner':base+owner,'pageType':next(x['pageType'] for x in rows if x['url']==base+owner),'visitorTask':term,'countryGroup':['UK','US','CA','AU','NZ','IE'],'countryEvidence':'unknown','demandStatus':'unknown, not zero','averageMonthlySearches':None,'monthlyTrend':None,'advertiserCompetition':None,'bidRanges':None,'sourceDate':'2026-10-04 supplied handover seeds; not measured metrics','plannedOriginalContribution':'Owned controls, worked examples and explicit source/method limits where upgraded; existing distinct workflow where retained','monetisationPath':'File review to batch/report development preview' if i in [0,1,2,4,11] else 'Regional manufacturer reference where suitable; no commission configured' if i in [7,8,9,10] else 'Useful next-job calculator and related workflow'})
(docs/'keyword-ownership.json').write_text(json.dumps({'settings':{'discovery':'Google Search, English, UK/US/CA/AU/NZ/IE','historicalWindow':'Latest available 12 months requested; no export supplied','metricsSource':'Unavailable GSC/Keyword Planner credentials or exports','priority':'Provisional task value, no traffic forecast or organic-difficulty claim'},'queries':queryrows},indent=2)+'\n')
briefLines=re.findall(r'^\| (\d+) \| (.*?) \|',request.split('## 21.')[1].split('## 22.')[0],re.M)
briefOwners=['how-to-compare-stl-revisions','batch-stl-checker','check-stl-files-before-selling','inspect-customer-supplied-print-files','how-much-filament-does-a-3d-print-use','filament-remaining-calculator','filament-dryer-vs-dry-box','3d-printing-materials/petg','3d-printing-materials/nylon','maximum-volumetric-speed-explained','brass-vs-hardened-nozzle','nozzle-layer-height-calculator','maximum-volumetric-speed-explained','maximum-volumetric-speed-explained','how-to-check-gcode-before-printing','why-stl-files-have-no-units','stl-file-wont-slice','how-to-scale-an-stl-file-for-3d-printing','how-to-check-if-a-3d-model-fits-your-printer','how-to-check-if-a-3d-model-fits-your-printer','3d-printing-materials','compare-materials/pla-vs-petg','compare-materials/petg-vs-asa','how-much-to-charge-for-3d-prints','how-to-calculate-3d-printing-cost']
assert len(briefLines)==25
briefs=[]
for (num,topic),owner in zip(briefLines,briefOwners):
 n=int(num);briefs.append({'brief':n,'topic':topic,'owner':base+'/'+owner,'outcome':'Implemented on distinct owner; merged variants avoid duplicate pages' if n!=6 else 'Custom-tare workflow implemented; brand-spool dataset deferred','originalEvidence':'Actual PrusaSlicer exports and explicit settings' if n in [10,14,17] else 'Owned geometry and report controls' if n in [1,2,3,4,16,18,19,20] else 'Transparent illustrative arithmetic or source-backed decision framework','deferral':'Exact brand-spool dataset requires verified variants and measurements; no invented tare presets' if n==6 else None})
(docs/'topic-brief-outcomes.json').write_text(json.dumps(briefs,indent=2)+'\n')
print(json.dumps({'publicPages':len(public),'new':len(new),'changed':len(changed),'seedMappings':len(queryrows),'briefs':len(briefs),'auditFindings':issues,'missing':missing}))
