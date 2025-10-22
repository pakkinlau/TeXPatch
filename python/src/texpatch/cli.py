import sys
from . import convert

def main(argv=None):
    data = sys.stdin.read()
    out = convert(data)
    sys.stdout.write(out)

