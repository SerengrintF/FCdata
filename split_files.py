# -*- coding: utf-8 -*-
import os

# 프로젝트 경로
project_path = r'C:\Cursor_project\server_1008_6 - 복사본'
os.chdir(project_path)

# js와 css 디렉토리 생성
os.makedirs('js', exist_ok=True)
os.makedirs('css', exist_ok=True)

print("디렉토리 생성 완료")

# script.js 분할
print("\nscript.js 분할 시작...")
with open('script.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

total_lines = len(lines)
print(f"전체 줄 수: {total_lines}")

# common.js (1-686줄)
with open('js/common.js', 'w', encoding='utf-8') as f:
    f.writelines(lines[0:686])
print("✓ js/common.js 생성 완료 (1-686줄)")

# dashboard.js (687-4987줄)
with open('js/dashboard.js', 'w', encoding='utf-8') as f:
    f.writelines(lines[686:4987])
print("✓ js/dashboard.js 생성 완료 (687-4987줄)")

# team-analysis.js (4988-6895줄)
with open('js/team-analysis.js', 'w', encoding='utf-8') as f:
    f.writelines(lines[4987:6895])
print("✓ js/team-analysis.js 생성 완료 (4988-6895줄)")

# formation-analysis.js (6896줄-끝)
with open('js/formation-analysis.js', 'w', encoding='utf-8') as f:
    f.writelines(lines[6895:])
print(f"✓ js/formation-analysis.js 생성 완료 (6896-{total_lines}줄)")

# style.css 분할
print("\nstyle.css 분할 시작...")
with open('style.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()

total_lines = len(lines)
print(f"전체 줄 수: {total_lines}")

# common.css (1-869줄)
with open('css/common.css', 'w', encoding='utf-8') as f:
    f.writelines(lines[0:869])
print("✓ css/common.css 생성 완료 (1-869줄)")

# dashboard.css (870-4231줄)
with open('css/dashboard.css', 'w', encoding='utf-8') as f:
    f.writelines(lines[869:4231])
print("✓ css/dashboard.css 생성 완료 (870-4231줄)")

# team-analysis.css (4232-5870줄)
with open('css/team-analysis.css', 'w', encoding='utf-8') as f:
    f.writelines(lines[4231:5870])
print("✓ css/team-analysis.css 생성 완료 (4232-5870줄)")

# formation-analysis.css (5871줄-끝)
with open('css/formation-analysis.css', 'w', encoding='utf-8') as f:
    f.writelines(lines[5870:])
print(f"✓ css/formation-analysis.css 생성 완료 (5871-{total_lines}줄)")

print("\n모든 파일 분할 완료!")

