import os
import glob
import re

games = glob.glob('app/dashboard/games/*/page.tsx')
for game in games:
    with open(game, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Parse teacher
    if "const isTeacher =" not in content:
        content = re.sub(
            r"const studentId = searchParams\.get\('studentId'\);",
            r"const studentId = searchParams.get('studentId');\n  const isTeacher = searchParams.get('teacher') === 'true';",
            content
        )

    # 2. Add isTeacher to useEffect dependencies and conditions
    # It usually looks like: if (studentId && !gameStarted)
    if "(studentId && !gameStarted)" in content:
        content = content.replace(
            "(studentId && !gameStarted)",
            "((studentId || isTeacher) && !gameStarted)"
        )
    
    # dependencies: [studentId, gameStarted] or similar
    if "[studentId, gameStarted]" in content:
        content = content.replace(
            "[studentId, gameStarted]",
            "[studentId, isTeacher, gameStarted]"
        )

    # 3. Modify startGame check
    # if (!studentName.trim() && !studentId) {
    if "&& !studentId)" in content and "&& !studentId && !isTeacher)" not in content:
        content = content.replace(
            "&& !studentId)",
            "&& !studentId && !isTeacher)"
        )

    # 4. Modify finishGame to avoid POST /api/scores if teacher
    if "await fetch('/api/scores'" in content and "if (!isTeacher) {" not in content:
        # We wrap the fetch call in if (!isTeacher)
        content = re.sub(
            r"(await fetch\('/api/scores'.*?\);)",
            r"if (!isTeacher) { \1 }",
            content,
            flags=re.DOTALL
        )

    with open(game, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Patched {len(games)} games for teacher bypass.")

# What about games outside of dashboard/games, like app/game/page.tsx?
game_main = 'app/game/page.tsx'
if os.path.exists(game_main):
    with open(game_main, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "const isTeacher =" not in content and "searchParams.get" in content:
        content = re.sub(
            r"const studentId = searchParams\.get\('studentId'\);",
            r"const studentId = searchParams.get('studentId');\n  const isTeacher = searchParams.get('teacher') === 'true';",
            content
        )
        if "(studentId && !gameStarted)" in content:
            content = content.replace("(studentId && !gameStarted)", "((studentId || isTeacher) && !gameStarted)")
        content = content.replace("[studentId, gameStarted]", "[studentId, isTeacher, gameStarted]")
        if "&& !studentId)" in content and "isTeacher" not in content.replace("&& !studentId)", "&& !studentId && !isTeacher)"):
            content = content.replace("&& !studentId)", "&& !studentId && !isTeacher)")
        if "await fetch('/api/scores'" in content and "if (!isTeacher)" not in content:
            content = re.sub(
                r"(await fetch\('/api/scores'.*?\);)",
                r"if (!isTeacher) { \1 }",
                content,
                flags=re.DOTALL
            )
        with open(game_main, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Patched app/game/page.tsx")
