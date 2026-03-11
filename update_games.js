const fs = require('fs');
const path = require('path');
const gamesDir = path.join(__dirname, 'app', 'dashboard', 'games');

const dirs = fs.readdirSync(gamesDir).filter(d => fs.statSync(path.join(gamesDir, d)).isDirectory());

dirs.forEach(d => {
    const file = path.join(gamesDir, d, 'page.tsx');
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');

        if (!content.includes('useSearchParams')) {
            content = content.replace("import { useRouter } from 'next/navigation';", "import { useRouter, useSearchParams } from 'next/navigation';");
            content = content.replace("const router = useRouter();", "const router = useRouter();\n    const searchParams = useSearchParams();\n    const studentId = searchParams.get('studentId');");

            content = content.replace("studentName,", "studentId: studentId,");
            content = content.replace("studentName: studentName.trim(),", "studentId: studentId,");

            fs.writeFileSync(file, content);
            console.log('Updated ' + file);
        }
    }
});
