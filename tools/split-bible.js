/**
 * 성경 원본 JSON(4.8MB, 31,102절)을 권(卷) 단위 파일로 쪼갠다.
 *
 *   node tools/split-bible.js
 *
 * 입력 : data/개역한글.json, data/개역개정.json   ({ "창1:1": "본문", ... })
 * 출력 : data/bible/han/1.json ~ 66.json          ({ "1": [{VerseNo, BibleScript}, ...], ... })
 *        data/bible/gae/1.json ~ 66.json
 *        data/bible/meta.json                     ([{ name, chapters: [절수, ...] }, ...])
 *
 * 앱 시작 시 전권을 파싱하지 않고, [보기]를 누른 권만 불러오기 위한 사전 작업.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'bible');

const bookName = [
    '창세기', '출애굽기', '레위기', '민수기', '신명기', '여호수아',
    '사사기', '룻기', '사무엘상', '사무엘하', '열왕기상', '열왕기하',
    '역대상', '역대하', '에스라', '느헤미야', '에스더', '욥기',
    '시편', '잠언', '전도서', '아가', '이사야', '예레미야',
    '애가', '에스겔', '다니엘', '호세아', '요엘', '아모스',
    '오바댜', '요나', '미가', '나훔', '하박국', '스바냐',
    '학개', '스가랴', '말라기',
    '마태복음', '마가복음', '누가복음', '요한복음', '사도행전', '로마서',
    '고린도전서', '고린도후서', '갈라디아서', '에베소서', '빌립보서', '골로새서',
    '데살로니가전서', '데살로니가후서', '디모데전서', '디모데후서', '디도서', '빌레몬서',
    '히브리서', '야고보서', '베드로전서', '베드로후서',
    '요한일서', '요한이서', '요한삼서', '유다서', '요한계시록'
];

const bookMnName = [
    '창', '출', '레', '민', '신', '수',
    '삿', '룻', '삼상', '삼하', '왕상', '왕하',
    '대상', '대하', '스', '느', '에', '욥',
    '시', '잠', '전', '아', '사', '렘',
    '애', '겔', '단', '호', '욜', '암',
    '옵', '욘', '미', '나', '합', '습',
    '학', '슥', '말',
    '마', '막', '눅', '요', '행', '롬',
    '고전', '고후', '갈', '엡', '빌', '골',
    '살전', '살후', '딤전', '딤후', '딛', '몬',
    '히', '약', '벧전', '벧후',
    '요일', '요이', '요삼', '유', '계'
];

const mnNameToId = new Map(bookMnName.map((mn, idx) => [mn, idx + 1]));

//'창1:1' -> { bookId: 1, chapter: 1, verseNo: 1 }
//개역개정에는 절 표기가 순수한 숫자가 아닌 키가 12건 있다.
//  - '신6:18-19' 처럼 두 절이 합쳐진 것(11건) -> 앞 절 번호(18)를 쓴다
//  - '요18:이'   처럼 원본 데이터가 깨진 것(1건) -> verseNo 없이 돌려보내 앞 절에 이어 붙인다
function parseKey(key) {
    const matched = /^(\D+)(\d+):(.+)$/.exec(key);
    if (!matched) return null;

    const bookId = mnNameToId.get(matched[1]);
    if (!bookId) return null;

    const verseMatched = /^(\d+)/.exec(matched[3]);

    return {
        bookId,
        chapter: +matched[2],
        verseNo: verseMatched ? +verseMatched[1] : null,
        rawVerse: matched[3],
    };
}

//번역본마다 본문 자리에 안내 문구가 들어있는 절이 있다. 화면/TTS에서 구분할 수 있게 표시를 붙인다.
//  - '(없음)'  : 사본 차이로 번역에서 통째로 빠진 절 (양쪽 13건씩)
//  - 다른 절을 가리키는 표기(개역한글 12건). 원본이 표기를 통일해두지 않아 형태가 여러 가지다:
//      '[1절과 같음]'  '8절과 같음'  '12절과 상동'  '[9절]과 동일함'  '상동'
const SAME_AS_RE = /^\[?(\d+)절\]?(?:과|와)\s*(?:같음|동일함|상동)\]?$/;
const SAME_AS_PREV_RE = /^상동$/;   //절 번호 없이 '앞 절과 같다'는 뜻

function markScript(verse, prevVerse) {
    if (/^\(없음\)$/.test(verse.BibleScript)) {
        verse.Omitted = true;
        return;
    }

    const sameAs = SAME_AS_RE.exec(verse.BibleScript);
    if (sameAs) {
        verse.SameAs = +sameAs[1];
    } else if (SAME_AS_PREV_RE.test(verse.BibleScript) && prevVerse) {
        //'상동'은 가리키는 절 번호가 없으므로 바로 앞 절로 해석한다
        verse.SameAs = prevVerse.VerseNo;
    } else {
        return;
    }

    //본문을 채워 넣으면 어느 절 내용인지 헷갈리므로, 가리키는 절 번호만 밝혀 표기를 통일한다
    verse.BibleScript = `[${verse.SameAs}절과 같음]`;
}

//원본은 거의 모든 절이 앞 공백 한 칸으로 시작하고, 연속 공백이 섞인 절도 몇 개 있다.
//표시에는 지장이 없지만 검색·비교에서 걸리므로 여기서 정리해둔다.
function cleanScript(text) {
    return text.replace(/\s+/g, ' ').trim();
}

function splitOne(srcFile, outName) {
    const srcPath = path.join(ROOT, 'data', srcFile);
    if (!fs.existsSync(srcPath)) {
        console.warn(`건너뜀: ${srcFile} 없음`);
        return null;
    }

    const data = JSON.parse(fs.readFileSync(srcPath, 'utf-8'));
    const books = new Map();   //bookId -> { chapter: [verse, ...] }
    let skipped = 0;
    let merged = 0;
    let labeled = 0;
    let omitted = 0;
    let sameAs = 0;

    for (const key in data) {
        const parsed = parseKey(key);
        if (!parsed) { skipped++; continue; }

        if (!books.has(parsed.bookId)) books.set(parsed.bookId, {});
        const chapters = books.get(parsed.bookId);
        const chapterKey = String(parsed.chapter);

        if (!chapters[chapterKey]) chapters[chapterKey] = [];
        const verses = chapters[chapterKey];

        //절 번호를 못 읽은 깨진 키는 바로 앞 절의 본문 뒤에 이어 붙인다.
        //'요18:이'처럼 절 번호 자리에 들어간 글자('이')가 원래 본문의 일부이므로 같이 되살린다.
        if (parsed.verseNo === null) {
            if (!verses.length) { skipped++; continue; }

            const prev = verses[verses.length - 1];
            prev.BibleScript = cleanScript(`${prev.BibleScript} ${parsed.rawVerse} ${data[key]}`);
            merged++;
            console.log(`  본문 병합: '${key}' -> ${prev.VerseNo}절 ('${parsed.rawVerse}' 복원)`);
            continue;
        }

        const verse = { VerseNo: parsed.verseNo, BibleScript: cleanScript(data[key]) };

        //'18-19'처럼 두 절이 합쳐진 절은 원래 표기를 같이 보관한다(화면에 그대로 찍기 위함)
        if (parsed.rawVerse !== String(parsed.verseNo)) verse.VerseLabel = parsed.rawVerse;

        markScript(verse, verses[verses.length - 1]);

        if (verse.VerseLabel) labeled++;
        if (verse.Omitted) omitted++;
        if (verse.SameAs) sameAs++;

        verses.push(verse);
    }

    const outDir = path.join(OUT_DIR, outName);
    fs.mkdirSync(outDir, { recursive: true });

    let written = 0;
    for (const [bookId, chapters] of books) {
        fs.writeFileSync(path.join(outDir, `${bookId}.json`), JSON.stringify(chapters), 'utf-8');
        written++;
    }

    console.log(`${srcFile} -> data/bible/${outName}/ : ${written}권, 본문 병합 ${merged}건, 해석 실패 ${skipped}건`);
    console.log(`  표시: 합본 절(VerseLabel) ${labeled}건 / 생략 절(Omitted) ${omitted}건 / 같음 절(SameAs) ${sameAs}건`);
    return books;
}

const hanBooks = splitOne('개역한글.json', 'han');
splitOne('개역개정.json', 'gae');

//생성한 파일 전체의 해시를 서비스워커에 심는다.
//이걸 안 하면 데이터를 다시 뽑아도 캐시 이름이 그대로라 사용자가 옛 본문을 계속 보게 된다.
function stampDataVersion() {
    const swPath = path.join(ROOT, 'serviceWorker.js');
    if (!fs.existsSync(swPath)) return;

    const hash = crypto.createHash('sha1');

    //파일 순서가 바뀌어도 해시가 흔들리지 않도록 경로를 정렬해서 넣는다
    const files = [];
    for (const dir of ['han', 'gae']) {
        const dirPath = path.join(OUT_DIR, dir);
        if (!fs.existsSync(dirPath)) continue;
        for (const f of fs.readdirSync(dirPath)) files.push(path.join(dirPath, f));
    }
    files.push(path.join(OUT_DIR, 'meta.json'));

    files.sort().forEach(f => {
        if (!fs.existsSync(f)) return;
        hash.update(path.relative(OUT_DIR, f));
        hash.update(fs.readFileSync(f));
    });

    const version = hash.digest('hex').slice(0, 8);
    const sw = fs.readFileSync(swPath, 'utf-8');
    const replaced = sw.replace(/const DATA_VERSION = '[^']*';/, `const DATA_VERSION = '${version}';`);

    if (replaced === sw) {
        console.warn('주의: serviceWorker.js에서 DATA_VERSION을 찾지 못했다. 캐시 버전을 직접 올려야 한다.');
        return;
    }

    fs.writeFileSync(swPath, replaced, 'utf-8');
    console.log(`serviceWorker.js DATA_VERSION -> '${version}'`);
}

//검색 기능용 메타(권 이름 + 장별 절 수). 개역한글 기준.
if (hanBooks) {
    const meta = bookName.map((name, idx) => {
        const chapters = hanBooks.get(idx + 1) || {};
        const counts = [];

        let chapter = 1;
        while (chapters[chapter]) {
            counts.push(chapters[chapter].length);
            chapter++;
        }

        return { name, chapters: counts };
    });

    fs.writeFileSync(path.join(OUT_DIR, 'meta.json'), JSON.stringify(meta), 'utf-8');
    console.log(`data/bible/meta.json : ${meta.length}권`);
}

stampDataVersion();
