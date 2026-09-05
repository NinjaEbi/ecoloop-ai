"""Creates an auditable mapping manifest; it never merges datasets automatically."""
import argparse,json
from pathlib import Path
def main():
 p=argparse.ArgumentParser();p.add_argument('--mapping',type=Path,required=True);p.add_argument('--output',type=Path,default=Path('data/processed/mapping_manifest.json'));a=p.parse_args();mapping=json.loads(a.mapping.read_text());a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps({'mapping':mapping,'rule':'Review semantic equivalence and leakage before any merge.'},indent=2));print(a.output)
if __name__=='__main__':main()
