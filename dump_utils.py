import inspect
from cjm_yolox_pytorch.utils import generate_output_grids
with open('src_utils.py', 'w', encoding='utf-8') as f:
    f.write(inspect.getsource(generate_output_grids))
