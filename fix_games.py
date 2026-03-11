import os
import glob
import re

base_dir = r"c:\Users\salah\Desktop\albar\app\dashboard\games"
pattern = os.path.join(base_dir, "*", "page.tsx")
files = glob.glob(pattern)

def modify_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if already modified
    if 'studentId: studentId' in content or 'eslint-disable-next-line react-hooks/exhaustive-deps' in content:
        pass

    # 1. Update startGame function condition
    content = re.sub(
        r'if\s*\(!studentName\.trim\(\)\)\s*\{',
        r'if (!studentName.trim() && !studentId) {',
        content,
        count=1
    )

    # 2. Add useEffect to auto-start if studentId exists
    # Find the end of startGame function and insert the useEffect right after it
    if 'eslint-disable-next-line react-hooks/exhaustive-deps' not in content:
        effect_code = """
    useEffect(() => {
        if (studentId && !gameStarted) {
            setGameStarted(true);
            setScore(0);
            setQuestionNumber(1);
            setStartTime(Date.now());
            generateQuestion();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId, gameStarted]);
"""
        start_game_match = re.search(r'const startGame = \(\) => \{.+?(?:\n\s*\};|\n    };)', content, flags=re.DOTALL)
        if start_game_match:
            end_idx = start_game_match.end()
            content = content[:end_idx] + "\n" + effect_code + content[end_idx:]
    
    # 3. Add studentId to body in fetch('/api/scores')
    content = re.sub(
        r'body:\s*JSON\.stringify\(\{\s*\n\s*studentName,',
        r"body: JSON.stringify({\n                    studentName: studentName || 'Student',\n                    studentId: studentId || undefined,",
        content
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for file in files:
    modify_file(file)
    print(f"Modified {file}")
