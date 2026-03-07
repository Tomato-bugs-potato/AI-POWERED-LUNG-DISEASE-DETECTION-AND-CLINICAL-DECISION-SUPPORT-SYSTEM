import inspect
from cjm_yolox_pytorch.inference import YOLOXInferenceWrapper

with open('src.py', 'w', encoding='utf-8') as f:
    f.write(inspect.getsource(YOLOXInferenceWrapper))
