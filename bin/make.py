#!/usr/bin/env python2.7

import os
import subprocess
import sys

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def split_path(path):
  d, p = os.path.split(path)
  f, e = os.path.splitext(p)
  return (d, f, e)

def path(p):
  return os.path.join(root, p)

def _resize(src, dst, w='', h=''):
  geom = '%sx%s' % (w, h)
  status = subprocess.call(['convert', '-geometry', geom, path(src), path(dst)])
  if status != 0:
    raise Exception('status: %d' % status)

def resize(src, dst, w='', h=''):
  _resize(src, dst, w=w, h=h)
  #retina
  if w != '':
    w *= 2
  if h != '':
    h *= 2
  _resize(src, '%s/%s@2x%s' % split_path(dst), w=w, h=h)

def mkdir(p):
  a = path(p)
  if not os.path.exists(a):
    os.makedirs(a)
  return from_dir(p)

def from_dir(p):
  return lambda x: os.path.join(p, x)

def main():
  toimgs = mkdir('demo/i')
  frsrcs = from_dir('bendy-and-muddy/photos')

  # page 1
  resize(frsrcs('2013-09-19 08.54.58.jpg'),
    toimgs('001.jpg'), w=250)
  resize(frsrcs('2013-09-19 08.55.12.jpg'),
    toimgs('002.jpg'), w=250)

  # page 2
  resize(frsrcs('2013-09-19 17.15.02.jpg'),
    toimgs('003.jpg'), w=250)
  resize(frsrcs('2013-09-19 17.13.20-2.jpg'),
    toimgs('004.jpg'), w=250)

  # page 3
  resize(frsrcs('2013-09-19 17.16.13.jpg'),
    toimgs('005.jpg'), w=500)

  # page 4
  resize(frsrcs('2013-09-19 11.02.51.jpg'),
    toimgs('006.jpg'), h=350)

  # page 5
  resize(frsrcs('2013-09-19 17.20.44.jpg'),
    toimgs('007.jpg'), w=500)

  # page 6
  resize(frsrcs('2013-09-19 17.21.52.jpg'),
    toimgs('008.jpg'), h=400)

  # page 7
  resize(frsrcs('2013-09-19 17.23.45.jpg'),
    toimgs('009.jpg'), w=475)

  # page 8
  resize(frsrcs('2013-09-19 17.28.27.jpg'),
    toimgs('010.jpg'), w=450)

  # page 9
  resize(frsrcs('2013-09-19 17.25.59.jpg'),
    toimgs('011.jpg'), w=500)

  return 0

if __name__ == '__main__':
  sys.exit(main())