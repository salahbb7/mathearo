import os
import re

games_dir = r'c:\Users\salah\Desktop\albar\app\dashboard\games'

for root, dirs, files in os.walk(games_dir):
    if 'page.tsx' in files:
        file_path = os.path.join(root, 'page.tsx')
        game_id = os.path.basename(root)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Look for the router.push to results
        # Pattern samples:
        # router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}`);
        # router.push(`/results?score=${score}&total=${totalQuestions}&time=${timeSpent}`);
        
        pattern = r'(router\.push\(\s*[`\'"]\s*/results\?score=\${(finalScore|score)}&total=\${totalQuestions}&time=\${timeSpent})([`\'"]\s*\);)'
        
        def replace_func(match):
            base = match.group(1)
            suffix = match.group(3)
            # Add gameId and studentId
            new_call = f"{base}&gameId={game_id}${{studentId ? `&studentId=${{studentId}}` : ''}}{suffix}"
            return new_call

        new_content = re.sub(pattern, replace_func, content)
        
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {file_path}")

# Also update the standalone game
standalone_game = r'c:\Users\salah\Desktop\albar\app\game\page.tsx'
if os.path.exists(standalone_game):
    with open(standalone_game, 'r', encoding='utf-8') as f:
        content = f.read()
    
    game_id = "double-half" # Placeholder or identifying name
    pattern = r'(router\.push\(\s*[`\'"]\s*/results\?score=\${(finalScore|score)}&total=\${totalQuestions}&time=\${timeSpent})([`\'"]\s*\);)'
    
    def replace_func_standalone(match):
        base = match.group(1)
        suffix = match.group(3)
        # Note: app/game/page.tsx might not have studentId defined in searchParams yet, 
        # but let's check its code.
        return f"{base}&gameId=game{suffix}" # /game maps to app/game/page.tsx

    new_content = re.sub(pattern, replace_func_standalone, content)
    if new_content != content:
        with open(standalone_game, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {standalone_game}")
