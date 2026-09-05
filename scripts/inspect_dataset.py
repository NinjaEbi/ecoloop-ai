"""Inspect an image-classification or YOLO dataset without altering it.

Usage: python scripts/inspect_dataset.py --path PATH_TO_DATASET --output docs/dataset_report.json
"""
import argparse, hashlib, json
from collections import Counter
from pathlib import Path
from PIL import Image

IMAGE_EXTENSIONS={'.jpg','.jpeg','.png','.bmp','.webp'}
def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()
def main():
    p=argparse.ArgumentParser();p.add_argument('--path',required=True,type=Path);p.add_argument('--output',type=Path,default=Path('docs/dataset_report.json'));args=p.parse_args()
    root=args.path; images=[x for x in root.rglob('*') if x.suffix.lower() in IMAGE_EXTENSIONS]
    corrupt=[]; hashes=Counter(); labels=Counter(); missing=[]
    for image in images:
        try:
            with Image.open(image) as im: im.verify()
        except Exception: corrupt.append(str(image))
        hashes[digest(image)]+=1
        txt=image.with_suffix('.txt')
        if txt.exists():
            for row in txt.read_text(errors='replace').splitlines():
                token=row.split()[:1]
                if token and token[0].isdigit(): labels[token[0]]+=1
        elif any(part.lower() in {'train','valid','val','test'} for part in image.parts): missing.append(str(image))
    yaml=next(iter(root.rglob('data.yaml')),None)
    report={'dataset_root':str(root),'image_count':len(images),'corrupt_images':corrupt,'duplicate_file_groups':sum(v>1 for v in hashes.values()),'yolo_annotation_counts_by_class_id':labels,'missing_yolo_label_files':missing,'data_yaml':yaml.read_text(errors='replace') if yaml else None,'note':'Counts are generated from supplied local data; classification-directory datasets need class folders reviewed separately.'}
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
