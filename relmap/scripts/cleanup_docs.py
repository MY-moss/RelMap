# -*- coding: utf-8 -*-
"""Read base64-encoded content files and write them to project plan directory."""
import os, sys, base64

BASE = r'D:\AI-moyang\AI_friend_database\项目方案'

def write_file(rel_path, content):
    fp = os.path.join(BASE, rel_path)
    os.makedirs(os.path.dirname(fp), exist_ok=True)
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: ' + rel_path + ' (' + str(len(content)) + ' bytes)')

def read_file(rel_path):
    fp = os.path.join(BASE, rel_path)
    with open(fp, 'r', encoding='utf-8') as f:
        return f.read()

# Read base64 content from stdin and write to specified file
# Format: <rel_path>\n<base64_content>
if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'test'
    if mode == 'test':
        write_file('03-问题与改进/test_write.txt', 'test ok')
        os.remove(os.path.join(BASE, '03-问题与改进/test_write.txt'))
        print('Test OK')
    elif mode == 'write':
        rel_path = sys.argv[2]
        b64_file = sys.argv[3]
        with open(b64_file, 'r') as f:
            b64_data = f.read().strip()
        content = base64.b64decode(b64_data).decode('utf-8')
        write_file(rel_path, content)
    elif mode == 'read':
        rel_path = sys.argv[2]
        content = read_file(rel_path)
        print(content[:200])
