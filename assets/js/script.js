let dailyData;
let dailyData2;
let bibleMap = {};
let bible2Map = {};

//읽기표를 '월_일'로 바로 찾기 위한 색인(매 클릭마다 365건을 훑지 않도록)
let dailyDataMap = new Map();

//연/월 선택 팝업의 선택 상태.
//목록을 잘라내도 선택이 사라지지 않도록 DOM(li.active)이 아니라 여기서 들고 있는다.
let selectedYear = null;
let selectedMonth = null;

const YEAR_INIT_RANGE = 50;    //팝업을 열 때 현재 연도 기준 앞뒤로 만드는 범위
const YEAR_PAGE = 30;          //끝에 가까워질 때마다 더 만드는 연도 수
const YEAR_KEEP_MAX = 150;     //목록에 유지하는 최대 개수(넘으면 반대쪽 끝을 잘라낸다)
const YEAR_PREFETCH = 8;       //끝에서 이만큼(칸 수) 남았을 때 미리 채운다

//이미 받아둔 권. bookId -> 로딩 Promise
const loadedBooks = new Map();

const bibleMeta = [];

let indexeddb;
let versedb;
let orgTxt = '';

//현재 달력이 그리고 있는 달(예: '2026_9'). 렌더 시점에 갱신되고,
//비동기로 돌아온 DB 결과는 이 값과 같을 때만 DOM에 반영한다.
let currentCalendarKey = '';

const isApp = typeof window !== 'undefined' && !!window.Capacitor;

let bibleType = {
    1: false,
    2: true
}

const DOM = {};



const bookName = [
    '창세기', '출애굽기', '레위기',
    '민수기', '신명기', '여호수아',
    '사사기', '룻기', '사무엘상', '사무엘하',
    '열왕기상', '열왕기하', '역대상', '역대하', '에스라',
    '느헤미야', '에스더', '욥기',
    '시편', '잠언', '전도서',
    '아가', '이사야', '예레미야',
    '애가', '에스겔', '다니엘',
    '호세아', '요엘', '아모스',
    '오바댜', '요나', '미가',
    '나훔', '하박국', '스바냐',
    '학개', '스가랴', '말라기',

    '마태복음', '마가복음', '누가복음',
    '요한복음', '사도행전', '로마서',
    '고린도전서', '고린도후서', '갈라디아서', '에베소서',
    '빌립보서', '골로새서', '데살로니가전서', '데살로니가후서',
    '디모데전서', '디모데후서', '디도서', '빌레몬서',
    '히브리서', '야고보서', '베드로전서', '베드로후서',
    '요한일서', '요한이서', '요한삼서', '유다서', '요한계시록'
];

const bookMnName = [
    '창', '출', '레',
    '민', '신', '수',
    '삿', '룻', '삼상', '삼하',
    '왕상', '왕하', '대상', '대하', '스',
    '느', '에', '욥',
    '시', '잠', '전',
    '아', '사', '렘',
    '애', '겔', '단',
    '호', '욜', '암',
    '옵', '욘', '미',
    '나', '합', '습',
    '학', '슥', '말',

    '마', '막', '눅',
    '요', '행', '롬',
    '고전', '고후', '갈', '엡',
    '빌', '골', '살전', '살후',
    '딤전', '딤후', '딛', '몬',
    '히', '약', '벧전', '벧후',
    '요일', '요이', '요삼', '유', '계'
];

let raf;

const tts = new TTS();

// getData();

window.addEventListener('DOMContentLoaded', () => {
    //dom들 선언
    DOM.loadingLayer = document.getElementById('loadingLayer');

    history.replaceState(null, '');

    if (!tts.isSupported) document.getElementById('voiceBtn').classList.add('hidden');

    //폰트사이즈 적용
    const savedFontSize = window.localStorage.getItem('fontSize');
    if (savedFontSize) setFontUI(+savedFontSize);

    //테마 적용
    const savedTheme = window.localStorage.getItem('theme');
    if (savedTheme) document.body.dataset.theme = savedTheme;

    //성경버전 적용
    const savedBibleVersion = window.localStorage.getItem('bibleVersion');
    if (savedBibleVersion) document.querySelector(`input[value="${savedBibleVersion}"]`).checked = true;

    preloadImages();
});

function preloadImages() {
    const seasons = ['spring', 'summer', 'autumn', 'winter']
    const modes = ['light', 'night']

    seasons.forEach(s => {
        modes.forEach(m => {
            const img = new Image();
            img.src = `./assets/imgs/bg_${s}_${m}.webp`;
        })
    })
}

function setBackground(targetMonth) {
    const now = new Date();
    const month = targetMonth || now.getMonth() + 1;
    const hours = now.getHours();

    let season = 'winter';

    if (month >= 3 && month <= 5) season = 'spring';
    else if (month >= 6 && month <= 8) season = 'summer';
    else if (month >= 9 && month <= 11) season = 'autumn';

    const timeMode = (hours >= 6 && hours < 18) ? 'light' : 'night';

    document.body.dataset.bg = `${season}-${timeMode}`;
}


//시작할 때는 읽기표와 성경 메타 정보만 받는다.
//본문(권당 30~300KB)은 [보기]를 누른 권만 loadBook으로 받는다.
async function getData() {
    const [guideRes, metaRes] = await Promise.all([
        fetch('data/guide/mccheyne.json'),
        fetch('data/bible/meta.json'),
    ])

    if (!guideRes.ok || !metaRes.ok) throw new Error('데이터 로드 실패');

    const [guide, meta] = await Promise.all([
        guideRes.json(),
        metaRes.json()
    ])

    dailyData = guide.data;

    bibleMeta.length = 0;
    meta.forEach(m => bibleMeta.push(m));
}

//권 단위 본문 로딩. 같은 권을 두 번 누르면 이미 받은 Promise를 그대로 돌려준다.
function loadBook(bookId) {
    if (loadedBooks.has(bookId)) return loadedBooks.get(bookId);

    const task = Promise.all([
        fetch(`data/bible/han/${bookId}.json`),
        isApp ? fetch(`data/bible/gae/${bookId}.json`) : undefined,
    ]).then(([hanRes, gaeRes]) => {
        if (!hanRes.ok || (isApp && !gaeRes.ok)) throw new Error(`${bookId}번 권 본문 로드 실패`);

        return Promise.all([
            hanRes.json(),
            isApp ? gaeRes.json() : undefined
        ]);
    }).then(([han, gae]) => {
        //기존 조회 형태(`${bookId}_${chapter}`)를 그대로 유지한다
        for (const chapter in han) bibleMap[`${bookId}_${chapter}`] = han[chapter];
        if (gae) for (const chapter in gae) bible2Map[`${bookId}_${chapter}`] = gae[chapter];
    }).catch(err => {
        loadedBooks.delete(bookId);   //실패한 권은 다음에 다시 시도할 수 있게 캐시에서 뺀다
        throw err;
    });

    loadedBooks.set(bookId, task);

    return task;
}

// function fnc_resize(){
//     const wvvph = window.visualViewport.height;
//     document.getElementById('dimLayer').style.height = wvvph + 'px';
// }

// window.addEventListener('resize', fnc_resize);

// window.addEventListener("popstate", function(event) {
//     alert("뒤로가기 버튼이 클릭되었습니다!");
// });


// window.addEventListener('beforeunload', function(event) {
//     // 사용자가 페이지를 떠나려 할 때 (뒤로 가기 포함)
//     event.preventDefault(); // 기본 동작을 막을 수 있음
//     event.returnValue = ''; // 브라우저에 따라 다를 수 있음
// });

function getRandomInt(mn, mx) {
    return Math.floor(Math.random() * (mx - mn + 1)) + mn;
}

function openPage(pageId, cb) {
    closePopup();
    closePage();

    history.pushState({ type: 'page', id: pageId }, '');

    document.getElementById('dimLayer').classList.remove('active');
    document.getElementById(pageId).classList.remove('hidden');

    if (cb && typeof cb === 'function') cb();
}
function closePage(cb) {
    tts.stopTTS();

    document.querySelectorAll('[data-role="page"]').forEach(p => {
        p.classList.add('hidden');
    })

    closePopup();

    document.getElementById('dimLayer').classList.remove('active');

    if (cb && typeof cb === 'function') cb();
}

function openPopup(popupId, cb, isReplace = false) {
    closePopup();

    if (isReplace) {
        history.replaceState({ type: 'popup', id: popupId }, '');
    } else {
        history.pushState({ type: 'popup', id: popupId }, '');
    }


    document.getElementById('dimLayer').classList.add('active');
    document.getElementById(popupId).classList.add('active');

    if (cb && typeof cb === 'function') cb();
}

function closePopup(cb) {
    tts.stopTTS();

    document.querySelectorAll('[data-verse-no]').forEach((v) => {
        v.removeAttribute('data-selected');
    })

    // document.getElementById('voiceBtn').dataset.status = 'normal';
    if (tts.preparedUtterances.length) document.getElementById('voiceBtn').dataset.status = 'normal';


    document.getElementById('dimLayer').classList.remove('active');
    document.querySelectorAll('#dimLayer > div').forEach((p) => {
        p.classList.remove('active');
    })

    if (cb && typeof cb === 'function') cb();
}

document.querySelectorAll('[data-id="closePageBtn"]').forEach(btn => {
    btn.addEventListener('click', () => {
        history.back();
    });
})


document.getElementById('dimLayer').addEventListener('click', e => {
    if (e.target === e.currentTarget) history.back();
})

document.querySelectorAll('[data-id="closePopupBtn"]').forEach(btn => {
    btn.addEventListener('click', () => {
        history.back();
    });
})

document.getElementById('todayBtn').addEventListener('click', () => {
    getCalendar('#calendar');
})

//li 한 칸 높이를 CSS에 맞춰 하드코딩하지 않고 실제 값을 읽는다
function getListItemHeight(list) {
    const first = list.querySelector('li');
    return (first && first.offsetHeight) || 30;
}

//선택한 항목이 목록 한가운데 오도록 스크롤한다.
//칸 수를 가정하지 않고 실제 높이로 계산하므로 팝업/칸 크기가 바뀌어도 맞는다.
function centerListItem(list, idx) {
    const itemHeight = getListItemHeight(list);
    const viewHeight = list.clientHeight || itemHeight * 5;

    list.scrollTop = (idx * itemHeight) - ((viewHeight - itemHeight) / 2);
}

function addListItemClick(li, onSelect) {
    li.addEventListener('click', e => {
        const targetLi = e.currentTarget;
        const list = targetLi.closest('ul');

        //전체를 훑지 않고 현재 선택된 항목만 해제한다
        const prevActive = list.querySelector('li.active');
        if (prevActive) prevActive.classList.remove('active');

        targetLi.classList.add('active');

        centerListItem(list, [...list.children].indexOf(targetLi));

        if (typeof onSelect === 'function') onSelect(+targetLi.textContent);
    })
}

function createYearLi(year) {
    const li = document.createElement('li');

    li.textContent = year;
    if (year === selectedYear) li.classList.add('active');

    addListItemClick(li, v => selectedYear = v);

    return li;
}

//목록이 무한정 늘어나지 않도록 반대쪽 끝을 잘라낸다.
//선택 상태는 selectedYear가 들고 있으므로, 잘라낸 연도로 다시 스크롤하면 active가 복원된다.
function trimYearList(list, side) {
    const lis = list.querySelectorAll('li');
    const over = lis.length - YEAR_KEEP_MAX;

    if (over <= 0) return;

    for (let i = 0; i < over; i++) {
        (side === 'top' ? lis[i] : lis[lis.length - 1 - i]).remove();
    }
}

document.getElementById('yearInput').addEventListener('click', (e) => {
    openPopup('datePopup');

    const yearInput = e.currentTarget;

    //현재 달력이 보고 있는 연/월을 선택 상태의 출발점으로 삼는다
    selectedYear = +yearInput.querySelector('span').textContent;
    selectedMonth = +yearInput.querySelector('strong').textContent;

    const yearList = document.getElementById('yearList');
    yearList.innerHTML = '';

    const startYear = Math.max(0, selectedYear - YEAR_INIT_RANGE);

    const fragment = document.createDocumentFragment();
    for (let y = startYear; y <= selectedYear + YEAR_INIT_RANGE; y++) {
        fragment.appendChild(createYearLi(y));
    }
    yearList.appendChild(fragment);

    centerListItem(yearList, selectedYear - startYear);

    const monthList = document.getElementById('monthList');

    monthList.querySelectorAll('li').forEach((li, idx) => {
        const isActive = +li.textContent === selectedMonth;

        li.classList.toggle('active', isActive);
        if (isActive) centerListItem(monthList, idx);
    })
})

//목록을 고치는 동안 발생하는 scroll 이벤트로 다시 들어오지 않게 막는다
let isGrowingYearList = false;

document.getElementById('yearList').addEventListener('scroll', e => {
    if (isGrowingYearList) return;

    const yearList = e.currentTarget;

    //끝에 완전히 닿고 나서 채우면 스크롤이 한 번 멈췄다가 다시 출발해 끊겨 보인다.
    //벽에 닿기 전에 미리 채운다.
    const threshold = getListItemHeight(yearList) * YEAR_PREFETCH;
    const atTop = yearList.scrollTop < threshold;
    const atBottom = yearList.scrollTop + yearList.clientHeight > yearList.scrollHeight - threshold;

    if (!atTop && !atBottom) return;

    const lis = yearList.querySelectorAll('li');
    const fragment = document.createDocumentFragment();

    isGrowingYearList = true;

    try {
        if (atTop) {
            const mnYear = +lis[0].textContent;
            const from = Math.max(0, mnYear - YEAR_PAGE);

            if (from >= mnYear) return;   //0년까지 왔으면 더 만들 게 없다

            for (let y = from; y < mnYear; y++) fragment.appendChild(createYearLi(y));

            //위쪽에 붙으면 보던 위치가 아래로 밀린다. 실제로 늘어난 높이만큼만 되돌린다.
            const before = yearList.scrollHeight;
            yearList.prepend(fragment);
            yearList.scrollTop += yearList.scrollHeight - before;

            trimYearList(yearList, 'bottom');   //아래쪽은 화면 밖이라 보정 불필요
        } else {
            const mxYear = +lis[lis.length - 1].textContent;

            for (let y = mxYear + 1; y <= mxYear + YEAR_PAGE; y++) fragment.appendChild(createYearLi(y));

            yearList.appendChild(fragment);     //아래쪽은 보정 불필요

            //위쪽을 잘라내면 보던 위치가 위로 튄다. 줄어든 높이만큼 빼준다.
            const before = yearList.scrollHeight;
            trimYearList(yearList, 'top');
            yearList.scrollTop -= before - yearList.scrollHeight;
        }
    } finally {
        isGrowingYearList = false;
    }
});

document.querySelectorAll('#monthList li').forEach(li => {
    addListItemClick(li, v => selectedMonth = v);
})

document.getElementById('applyDateBtn').addEventListener('click', () => {
    //목록을 잘라내도 선택이 유지되도록 DOM이 아니라 변수를 읽는다
    if (selectedYear === null) {
        alert('year을 선택해주세요.');
        return;
    }
    if (selectedMonth === null) {
        alert('month를 선택해주세요.');
        return;
    }

    history.back();

    getCalendar('#calendar', { y: selectedYear, m: selectedMonth, d: 1 });
})

document.getElementById('prevMonthBtn').addEventListener('click', () => {
    const yearInput = document.getElementById('yearInput');
    const thisYear = yearInput.querySelector('span').textContent;
    const thisMonth = yearInput.querySelector('strong').textContent;

    const thisDate = new Date(+thisYear, (+thisMonth - 1), 1);
    getCalendar('#calendar', { y: thisDate.getFullYear(), m: (+thisMonth - 1), d: 1 });
})
document.getElementById('nextMonthBtn').addEventListener('click', () => {
    const yearInput = document.getElementById('yearInput');
    const thisYear = yearInput.querySelector('span').textContent;
    const thisMonth = yearInput.querySelector('strong').textContent;
    const thisDate = new Date(+thisYear, (+thisMonth - 1), 1);

    getCalendar('#calendar', { y: thisDate.getFullYear(), m: (+thisMonth + 1), d: 1 });
})

document.getElementById('hamburger').addEventListener('click', () => {
    openPopup('menuPopup', () => {

    });
})



const textarea = document.querySelector('#memoPopup textarea');
const regMemoBtn = document.getElementById('regMemoBtn');
const regSection = document.getElementById('regSection');
const modOnBtn = document.getElementById('modOnBtn');
const bibleScriptTag = document.getElementById('bibleScript');
const bibleName = document.getElementById('bibleName'); //바이블페이지내 제목


modOnBtn.addEventListener('click', () => {
    regSection.classList.remove('hidden');
    modOnBtn.classList.add('hidden');
    textarea.removeAttribute('disabled');
    setTimeout(() => {
        textarea.focus();
    }, 200);
});

document.getElementById('initMemoBtn').addEventListener('click', () => {
    history.back();
})

regMemoBtn.addEventListener('click', () => {
    const thisDate2 = document.getElementById('bibleList').dataset.date;
    indexeddb.query('u', { id: thisDate2, memo: textarea.value }, {
        upsert: true,
        success: () => {
            history.back();

            const targetTd = getCalendarCell(thisDate2);
            const memoBtn = document.querySelector('[data-id="memoBtn"]');

            if (textarea.value !== '') {
                memoBtn.classList.add('has-memo');
                targetTd.classList.add('has-memo');
            } else {
                memoBtn.classList.remove('has-memo');
                targetTd.classList.remove('has-memo');
            }
        }
    });
})

function dateFormat(d) {
    return {
        y: d.getFullYear(),
        m: d.getMonth() + 1,
        d: d.getDate(),
    };
}

function parseBook(txt) {
    const bookArr1 = txt.split('/');
    const bookArr2 = [];
    let finalTxt = '';

    bookArr1.forEach(el => {
        finalTxt = '';
        const book = el.split('b');
        finalTxt += bookName[+book[0] - 1] + ' ';

        if (book[1].indexOf('-') > -1) {  //어디부터 어디까지
            finalTxt += book[1].split('-')[0] + '~' + book[1].split('-')[1] + (+book[0] === 19 ? '편' : '장');
        } else {
            if (book[1].indexOf(':') > -1) {
                finalTxt += book[1].split(':')[0] + (+book[0] === 19 ? '편' : '장');
                if (book[1].indexOf('~') > -1) {
                    const verses = book[1].split('~');
                    if (verses[0].split(':')[1] === verses[1]) {
                        finalTxt += ' ' + verses[1] + '절';
                    } else {
                        finalTxt += ' ' + verses[0].split(':')[1] + '~' + verses[1] + '절';
                    }
                }
            } else {
                finalTxt += book[1] + (+book[0] === 19 ? '편' : '장');
            }
        }
        bookArr2.push(finalTxt);
    })

    return bookArr2;
}

//'19b3-7' -> ['19b3','19b4','19b5','19b6','19b7']. 범위 표기가 아니면 그대로 한 건만 돌려준다.
//절 범위는 '-'가 아니라 '~'를 쓰므로(19b119:1~8) 여기 걸리지 않는다.
function expandRange(code) {
    const [book, range] = code.split('b');

    if (!range || range.indexOf('-') < 0) return [code];

    const [from, to] = range.split('-');
    const list = [];

    for (let i = +from; i <= +to; i++) list.push(`${book}b${i}`);

    return list;
}

//'2026_9_24' 또는 '9_24' 형태에서 달력의 해당 날짜 칸을 찾는다
function getCalendarCell(dateId) {
    return document.querySelector(`#calendar td[data-date="${dateId.split('_').pop()}"]`);
}

function isEqualArr(a, b) {
    const setA = new Set(a);
    const setB = new Set(b);

    if (setA.size !== setB.size) return false; // 원소 개수가 다르면 바로 false
    for (let item of setA) {
        if (!setB.has(item)) return false; // 하나라도 없다면 false
    }
    return true;
}

function getCalendar(target, setDate) {
    const calendarTarget = typeof target == 'object' ? target : document.querySelector(target);

    //ui초기화
    calendarTarget.innerHTML = '';


    const memoBtn = document.querySelector('[data-id="memoBtn"]');
    if (memoBtn) memoBtn.remove();

    const dateKr = ['일', '월', '화', '수', '목', '금', '토'];
    const date = setDate ? new Date(setDate.y, setDate.m - 1, setDate.d) : new Date();
    const nowD = date.getDate();	//index아님
    const tmpDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const lastDay = tmpDate.getDate();	//마지막일

    //이번 렌더가 담당하는 달을 고정(이후 도착하는 이전 달의 응답을 걸러내기 위함)
    const renderKey = `${date.getFullYear()}_${date.getMonth() + 1}`;
    currentCalendarKey = renderKey;


    //배경 변경
    setBackground(date.getMonth() + 1);

    tmpDate.setDate(1);
    const dayFirst = tmpDate.getDay();	//금월 첫 요일
    const rowCnt = calcBlockCnt(dayFirst, lastDay);

    document.getElementById('yearInput').innerHTML = `
        <span>${date.getFullYear()}</span>
        <strong>${date.getMonth() + 1}</strong>
    `;

    //위에 컨텐츠
    const tableTag = appendTag(calendarTarget, 'table', {
        style: {
            tableLayout: 'fixed',
            borderCollapse: 'collapse',
            width: '100%',
        }
    })

    const tHeadTag = appendTag(tableTag, 'thead');
    const headTrTag1 = appendTag(tHeadTag, 'tr');

    calendarTarget.appendChild(tableTag);
    for (let i = 0; i < 7; i++) {
        const week = appendTag(headTrTag1, 'TH', {
            html: dateKr[i],
        });

        if (i == 0) week.classList.add('sun');
        if (i == 6) week.classList.add('sat');
    }

    //아래 컨텐츠
    //만든 칸을 그대로 들고 있는다. 매번 document 전체에서 다시 찾지 않기 위함.
    const allCells = [];        //data-block-idx 순서
    const dayCells = [];        //날짜(1~말일)로 찾기

    const tBodyTag = document.createElement('TBODY');
    tableTag.appendChild(tBodyTag);
    for (let i = 0; i < rowCnt; i++) {
        const trTag = appendTag(tBodyTag, 'TR');

        for (let j = 0; j < 7; j++) {
            allCells.push(appendTag(trTag, 'TD', {
                attr: { 'data-block-idx': ((i * 7) + (j + 1)) }
            }));
        }
    }

    for (let i = 0; i < lastDay; i++) {
        const blockTarget = allCells[i + dayFirst];
        dayCells[i + 1] = blockTarget;
        blockTarget.addEventListener('click', e => {
            cancelAnimationFrame(raf);
            const oldSnow = document.querySelector('[data-effect="snow"]');
            if (oldSnow) oldSnow.remove();

            allCells.forEach(block => block.classList.remove('on'));
            blockTarget.classList.add('on');

            const thisYear = +document.getElementById('yearInput').querySelector('span').textContent;
            const thisMonth = +document.getElementById('yearInput').querySelector('strong').textContent;
            const thisDate = +e.currentTarget.dataset.date;

            const nowData = dailyDataMap.get(`${thisMonth}_${thisDate}`);

            const oldBibleList = document.getElementById('bibleList');
            if (oldBibleList) oldBibleList.remove();

            const bibleListTag = document.createElement('ul');
            bibleListTag.id = 'bibleList';
            bibleListTag.classList.add('bible-list');

            const combiDate = `${thisYear}_${thisMonth}_${thisDate}`;
            bibleListTag.dataset.date = combiDate;

            document.getElementById('bibleSection').appendChild(bibleListTag);

            //맥체인 가이드는 365일치라 2/29 같은 날은 데이터가 없다. 이 경우 빈 목록으로 둔다.
            if (nowData) nowData.readings.split('/').forEach(d => {
                const expanded = expandRange(d);
                const org = expanded.length > 1 ? d : undefined;   //범위에서 펼쳐진 항목만 원본 표기를 남긴다

                expanded.forEach(code => bibleListTag.appendChild(bibleTemplate(code, org)));
            });

            const memo = () => {
                const memoBtn = document.createElement('button');
                memoBtn.classList.add('memo-btn');
                memoBtn.dataset.id = 'memoBtn';
                memoBtn.textContent = `동행`;

                memoBtn.addEventListener('click', () => {
                    openPopup('memoPopup', () => {
                        const thisDate = document.getElementById('bibleList').dataset.date;
                        textarea.value = '';
                        textarea.removeAttribute('disabled');
                        modOnBtn.classList.remove('hidden');
                        regSection.classList.remove('hidden');
                        document.querySelector('#memoPopup header').innerHTML = `동행<span>(${thisDate.replaceAll('_', '.')})</span>`;

                        orgTxt = '';

                        indexeddb.query('r', thisDate, {
                            success: (d) => {

                                if (d && d.memo !== undefined && d.memo !== '') { //값이 있음
                                    orgTxt = d.memo;
                                    textarea.value = d.memo;
                                    textarea.disabled = true;
                                    regSection.classList.add('hidden');
                                } else {  //값이 없음
                                    regSection.classList.remove('hidden');
                                    modOnBtn.classList.add('hidden');
                                    setTimeout(() => {
                                        textarea.focus();
                                    }, 200);
                                }
                            }
                        });
                    });
                })

                return memoBtn;
            }

            const oldMemo = document.querySelector('[data-id="memoBtn"]');
            if (oldMemo) oldMemo.remove();

            document.getElementById('calendarPageMain').appendChild(memo());

            //저장된 데이터 처리
            document.getElementById('allChker').checked = false;
            let isAllChked = true;

            indexeddb.query('r', combiDate, {
                success: (d) => {
                    if (!d) return;

                    if (d && d.memo !== undefined && d.memo !== '') {
                        document.querySelector('[data-id="memoBtn"]').classList.add('has-memo');
                    }

                    if (d && d.dailyChked) {
                        d.dailyChked.forEach((c) => {
                            const targetInput = bibleListTag.querySelector(`input[value="${c}"]`);
                            if (targetInput) targetInput.checked = true;  //가이드가 바뀌어 없는 항목이면 건너뛴다
                        })
                    }

                    const inputs = bibleListTag.querySelectorAll('input');

                    inputs.forEach(input => {
                        if (!input.checked) isAllChked = false;
                    })

                    //읽을 본문이 없는 날은 전체선택도 없다
                    if (inputs.length && isAllChked) document.getElementById('allChker').checked = true;
                }
            });

            if (thisMonth === 12 && thisDate === 25) {
                snowEffect();
            }

        })
        // blockTarget.insertAdjacentHTML('afterbegin', (i + 1));
        blockTarget.innerHTML = `<div><strong>${(i + 1)}</strong><span></span></div>`;
        blockTarget.setAttribute('data-date', (i + 1));
        blockTarget.style.cssText += `color: #000;`;
    }

    for (let i = 0; i < 6; i++) {	//토일 색 변경
        const redTarget = allCells[i * 7];
        const blueTarget = allCells[(i * 7) + 6];

        // if(redTarget) redTarget.style.color = '#f0f';
        // if(blueTarget) blueTarget.style.color = '#0ff';

        if (redTarget && redTarget.querySelector('strong')) redTarget.querySelector('strong').classList.add('sun');
        if (blueTarget && blueTarget.querySelector('strong')) blueTarget.querySelector('strong').classList.add('sat');
    }

    const nowD2 = new Date();
    if (+nowD2.getFullYear() === +document.getElementById('yearInput').querySelector('span').textContent
        && +(nowD2.getMonth() + 1) === +document.getElementById('yearInput').querySelector('strong').textContent) {
        const todayTarget = dayCells[nowD2.getDate()];
        todayTarget.querySelector('strong').classList.add('today');
    }

    if (!setDate) {   //투데이 자동 클릭
        setTimeout(() => {
            dayCells[nowD].click();
        })
    }

    indexeddb.query('r', undefined, {
        like: `${renderKey}_`,
        success: (data) => {
            //내가 그린 달이 이미 다른 달로 바뀌었으면 이 응답은 버린다
            if (renderKey !== currentCalendarKey) return;

            const mapedData = data.map(d => {
                const copyId = d.id.split('_').slice(1);
                return copyId.join('_');
            })
            const mapedData2 = data.map(d => {
                const copyId = d.id.split('_').slice(1);
                return { ...d, id: copyId.join('_') };
            })

            const set = new Set(mapedData);

            //그날 가이드가 요구하는 읽기 목록을 범위까지 펼쳐 날짜별로 보관한다.
            //원본 dailyData2를 고쳐 쓰지 않도록 새 배열로 만든다.
            const guideChkedMap = new Map(
                dailyData2
                    .filter(d => set.has(d.id))
                    .map(d => [d.id, d.dailyChked.flatMap(expandRange)])
            );

            mapedData2.forEach(d => {   //여기서 다 담아라
                const targetTd = dayCells[+d.id.split('_')[1]];
                if (!targetTd) return;  //해당 날짜 칸이 없으면(말일 차이 등) 건너뛴다

                if (d.dailyChked && d.dailyChked.length > 0) {
                    const guideChked = guideChkedMap.get(d.id);
                    let clsNm = 'ing';
                    if (guideChked && isEqualArr(d.dailyChked, guideChked)) clsNm = 'clear';
                    targetTd.classList.add(clsNm);
                }

                if (d.memo) targetTd.classList.add('has-memo');
            })
        }
    });

    const oldBibleList = document.getElementById('bibleList');
    if (oldBibleList) oldBibleList.remove();

    document.getElementById('allChker').checked = false;
}

const selectControl = new SelectControl();

function bibleTemplate(d, org) {
    const li = document.createElement('li');
    li.innerHTML = `
        <div>
            <label class="checkbox1">
                <input type="checkbox" value="${d}" data-id="chkRead" />
                <span></span>
                <strong class="bible-range">${parseBook(d)}</strong>
            </label>
            <button class="flex-center">보기</button>
        </div>
    `;

    const outerChkBox = li.querySelector('input');

    if (org !== undefined) outerChkBox.dataset.org = org;

    outerChkBox.addEventListener('change', e => {
        const thisDate = document.getElementById('bibleList').dataset.date;

        let isAllChked = true;

        let chkedCnt = 0;

        const inputs = document.querySelectorAll('#bibleList input');

        const chkedData = [];

        inputs.forEach(inp => {
            if (!inp.checked) {
                isAllChked = false;
            } else {
                chkedData.push(inp.value);
                chkedCnt++;
            }
        })

        const targetTd = getCalendarCell(thisDate);

        targetTd.classList.remove('clear');
        targetTd.classList.remove('ing');

        if (chkedCnt === inputs.length) { //완료
            targetTd.classList.add('clear');
        } else if (chkedCnt > 0) {  //진행중
            targetTd.classList.add('ing');
        }

        document.getElementById('allChker').checked = isAllChked;

        indexeddb.query('u', { id: thisDate, dailyChked: chkedData }, { upsert: true });

    })

    //이부분이 [보기]버튼 눌렀을 때
    li.querySelector('button').addEventListener('click', async e => {
        const bibleVersion = isApp ? (window.localStorage.getItem('bibleVersion') || 'han') : 'han';

        const targetInput = e.currentTarget.closest('li').querySelector('input');
        const parseData = d.split('b');
        const bookId = +parseData[0];

        //아직 안 받은 권이면 여기서 받는다(처음 한 번만 네트워크/디스크 접근)
        if (!loadedBooks.has(bookId)) DOM.loadingLayer.classList.add('active');

        try {
            await loadBook(bookId);
        } catch (err) {
            console.error(err);
            alert('본문을 불러오지 못했습니다.\n네트워크 상태를 확인한 뒤 다시 시도해주세요.');
            return;
        } finally {
            DOM.loadingLayer.classList.remove('active');
        }

        openPage('biblePage');

        document.querySelector('#biblePage input').checked = targetInput.checked;

        document.querySelector('#biblePage input').onchange = e => {
            targetInput.checked = e.currentTarget.checked;
            const changeEvent = new Event('change');
            targetInput.dispatchEvent(changeEvent);
        };

        let thisBible;  //개역한글
        let thisBible2; //개역개정

        const ranged2 = parseData[1].split(':');

        if (ranged2.length === 2) {
            const chapter = +ranged2[0];
            const verse = ranged2[1];

            // 신규 - Map으로 해당 장 먼저 가져온 후 절 범위만 필터
            const verseFrom = +verse.split('~')[0];
            const verseTo = +verse.split('~')[1];
            thisBible = (bibleMap[`${parseData[0]}_${chapter}`] || []).filter(bs => verseFrom <= bs.VerseNo && bs.VerseNo <= verseTo);
            thisBible2 = (bible2Map[`${parseData[0]}_${chapter}`] || []).filter(bs => verseFrom <= bs.VerseNo && bs.VerseNo <= verseTo);

        } else {
            thisBible = bibleMap[`${parseData[0]}_${parseData[1]}`];
            thisBible2 = bible2Map[`${parseData[0]}_${parseData[1]}`];
        }

        bibleName.textContent = parseBook(d);
        const bookChapter = d.split(':')[0].split('b');
        bibleName.dataset.mnName = `${bookMnName[bookChapter[0] - 1]}${bookChapter[1]}`;

        bibleScriptTag.innerHTML = '';
        bibleScriptTag.scrollTop = 0;

        tts.initData();

        //절마다 appendChild하면 절 수만큼 레이아웃이 다시 계산된다(시편 119편은 176절).
        //조각에 모았다가 마지막에 한 번만 붙인다.
        const verseFragment = document.createDocumentFragment();

        (bibleVersion === 'han' ? thisBible : thisBible2).forEach((dd, idx) => {
            const div = document.createElement('div');
            div.dataset.verseNo = dd.VerseNo;
            div.dataset.idx = idx;
            div.dataset.bibleCode = d + ':' + dd.VerseNo;

            //번역본 특성 표시(CSS에서 흐리게 처리하는 등에 쓸 수 있다)
            if (dd.Omitted) div.dataset.omitted = 'true';       //번역에서 빠진 절
            if (dd.SameAs) div.dataset.sameAs = dd.SameAs;      //앞 절과 본문이 같은 절

            div.innerHTML = `
                <div class="verse-wrapper" data-id="verseWrapper">
                    <div class="verse-top-wrapper" data-id="verseTopWrapper">
                        <div class="verse-no">${dd.VerseLabel || dd.VerseNo}</div>
                    </div>
                    <div data-id="bibleScript"><span>${dd.BibleScript}</span></div>
                </div>
            `;
            verseFragment.appendChild(div);

            //'(없음)'만 적힌 절은 소리 내어 읽지 않는다
            if (!dd.Omitted) tts.pushArray(tts.createSpeechUtterance(dd.VerseNo, dd.BibleScript));
        });

        bibleScriptTag.appendChild(verseFragment);

        selectControl.scripts = bibleScriptTag.querySelectorAll('[data-verse-no]');
        selectControl.init();


        if (tts.preparedUtterances.length) document.getElementById('voiceBtn').dataset.status = 'normal';

        const prefix = d + ':';
        versedb.query('r', undefined, {
            like: prefix,
            success: (verseData) => {
                verseData.forEach((dd) => {
                    const target = document.querySelector(`[data-bible-code="${dd.id}"] [data-id="bibleScript"] > span`);
                    target.dataset.color = dd.color;

                    const wrapper = document.querySelector(`[data-bible-code="${dd.id}"] [data-id="verseWrapper"]`);
                    const targetUl = document.createElement('ul');
                    targetUl.classList.add('hidden');
                    wrapper.append(targetUl);

                    if (dd.memos) dd.memos.reverse().forEach((memo) => {
                        createMemoToggleBtn(wrapper.querySelector('[data-id="verseTopWrapper"]'));
                        createMemo(targetUl, memo);
                    })
                })
            }
        })
    })

    return li;
}

function SelectControl() {
    const $t = this;
    $t.currDir = 0;   //0: 앞, 1: 뒤
    $t.scripts = null;
    $t.selectedPopup = document.getElementById('selectedPopup');
    $t.configWrapper = document.getElementById('configWrapper');
    $t.colorPopup = document.getElementById('colorPopup');
    $t.verseMemoPopup = document.getElementById('verseMemoPopup');
    $t.memoTextarea = $t.verseMemoPopup.querySelector('textarea');

    // 기존
    $t.handle = (idx) => {
        if (idx === undefined) {
            $t.scripts.forEach(el => {
                el.removeAttribute('data-selected');
            })

            $t.toggleSelectPopup(false);
            return;
        }

        const oldSelected = bibleScriptTag.querySelectorAll('[data-selected="true"]');
        const newSelect = $t.scripts[idx];
        const newIdx = +newSelect.dataset.idx;

        if (!oldSelected.length) {
            newSelect.dataset.selected = true;
            $t.toggleSelectPopup(true);
            return;
        }

        const oldIdx1 = +oldSelected[0].dataset.idx;

        if (oldSelected.length === 1) {
            if (oldIdx1 === newIdx) {
                oldSelected[0].removeAttribute('data-selected');
                $t.currDir = 0;

                $t.toggleSelectPopup(false);
                return;
            }

            const from = Math.min(oldIdx1, newIdx);
            const to = Math.max(oldIdx1, newIdx);

            $t.scripts.forEach((el, i) => {
                if (from <= i && i <= to) el.dataset.selected = true;
            });
            $t.currDir = oldIdx1 < newIdx ? 1 : 0;
            $t.toggleSelectPopup(true);

        } else {
            const oldIdx2 = +oldSelected[oldSelected.length - 1].dataset.idx;

            if (newIdx < oldIdx1) {
                $t.scripts.forEach((el, i) => {
                    if (newIdx <= i && i <= oldIdx1) el.dataset.selected = true;
                });
                $t.currDir = 0;

            } else if (oldIdx2 < newIdx) {
                $t.scripts.forEach((el, i) => {
                    if (oldIdx2 <= i && i <= newIdx) el.dataset.selected = true;
                });
                $t.currDir = 1;

            } else {
                $t.scripts.forEach((el, i) => {
                    const ifCase = $t.currDir ? newIdx <= i : i <= newIdx;
                    if (ifCase) el.removeAttribute('data-selected');
                });

                if (!bibleScriptTag.querySelectorAll('[data-selected="true"]').length) {
                    $t.toggleSelectPopup(false);
                    return;
                }
            }

            $t.toggleSelectPopup(true);
        }
    }

    $t.init = () => {
        $t.toggleSelectPopup(false);
    }

    $t.toggleSelectPopup = (bool, cb) => {
        $t.selectedPopup.classList.toggle('active', bool);
        $t.configWrapper.classList.toggle('hidden', bool);

        if (typeof cb === 'function') cb();
    }

    $t.togglePopup = (target, bool, cb) => {
        const targetPopup = $t[target];
        if (!targetPopup) return;
        targetPopup.classList.toggle('active', bool);
    }

    $t.toggleMemoPopup = (bool, cb) => {
        $t.verseMemoPopup.classList.toggle('active', bool);

        if (typeof cb === 'function') cb();
    }

    $t.closeAllPopup = () => {
        $t.togglePopup('selectedPopup', false);
        $t.togglePopup('colorPopup', false);
        $t.togglePopup('verseMemoPopup', false);

        $t.memoTextarea.value = '';
    }

    const btnFnc = {
        verseMemoBtn: () => {
            $t.toggleMemoPopup(true, () => {
                setTimeout(() => {
                    $t.memoTextarea.focus();
                });
            });
        },
        colorPenBtn: () => {
            $t.togglePopup('colorPopup', true);
        },
        copyVerseBtn: () => {
            const selectedScript = bibleScriptTag.querySelectorAll('[data-selected="true"]');
            const len = selectedScript.length;
            const bibleInfo = bibleName.dataset.mnName;
            const verseInfo = selectedScript[0].dataset.verseNo + (len > 1 ? `-${String(selectedScript[len - 1].dataset.verseNo)}` : '');
            let txt = `[${bibleInfo}:${verseInfo}]`;


            if (len > 1) {
                selectedScript.forEach((el) => {
                    txt += '\n' + el.dataset.verseNo + ' ' + el.querySelector('[data-id="bibleScript"]').textContent.trim();
                })
            } else {
                txt += '\n' + selectedScript[0].querySelector('[data-id="bibleScript"]').textContent.trim();
            }

            navigator.clipboard.writeText(txt)
                .then(() => alert('클립보드에 복사했습니다.'))
                .catch(err => console.error(err));
        },
        cancelSelecteBtn: () => {
            $t.handle();
        }
    };

    (function constructor() {
        $t.init();

        $t.selectedPopup.addEventListener('click', e => {
            const btn = e.target.closest('button');

            if (!btn) return;

            const fnc = btnFnc[btn.id];

            if (typeof fnc === 'function') fnc();
        });

        $t.verseMemoPopup.addEventListener('click', e => {
            const regVerseMemoBtn = e.target.closest('#regVerseMemoBtn');
            const closeVerseMemoPopupBtn = e.target.closest('#closeVerseMemoPopupBtn');
            const textarea = $t.memoTextarea;

            if (regVerseMemoBtn) {
                if (!textarea.value.length) {
                    alert('내용을 입력해주세요.');
                    textarea.focus();
                    return;
                }

                if (!confirm('메모를 등록하시겠습니까?')) return;

                const selectedScript = bibleScriptTag.querySelectorAll('[data-selected="true"]');
                const len = selectedScript.length;
                const bibleInfo = bibleName.dataset.mnName;
                const verseInfo = selectedScript[0].dataset.verseNo + (len > 1 ? `-${String(selectedScript[len - 1].dataset.verseNo)}` : '');
                let verseInfo2 = `[${bibleInfo}:${verseInfo}]`;


                const now = new Date();

                const targetIds = [...selectedScript].map((el) => el.dataset.bibleCode);

                const memoText = textarea.value;

                versedb.query('r', targetIds, {
                    success: (data) => {
                        //구절별 저장을 Promise로 감싸서, 전부 끝난 뒤에만 완료를 알린다
                        const saveTasks = targetIds.map(targetId => new Promise((resolve, reject) => {
                            const oldData = data.find(item => item.id === targetId) || { id: targetId };
                            const oldMemos = oldData.memos && Array.isArray(oldData.memos) ? oldData.memos : [];
                            oldMemos.push({
                                memoId: now.getTime(),
                                verseInfo: verseInfo2,
                                text: memoText
                            });

                            versedb.query('u', {
                                ...oldData,
                                memos: oldMemos,
                            }, {
                                upsert: true,
                                success: (d) => {
                                    const wrapper = document.querySelector(`[data-bible-code="${d}"] [data-id="verseWrapper"]`);
                                    if (!wrapper) {   //다른 장으로 이동한 뒤 저장이 끝난 경우
                                        resolve(d);
                                        return;
                                    }

                                    let targetUl = wrapper.querySelector('ul');
                                    if (targetUl) {
                                        targetUl.innerHTML = '';
                                    } else {
                                        targetUl = document.createElement('ul');
                                        wrapper.append(targetUl);
                                    }

                                    oldMemos.reverse().forEach((memo) => {
                                        createMemoToggleBtn(wrapper.querySelector('[data-id="verseTopWrapper"]'));
                                        createMemo(targetUl, memo);
                                    })
                                    wrapper.querySelector('[data-id="memoToggle"] input').checked = true;
                                    targetUl.classList.remove('hidden');

                                    resolve(d);
                                },
                                error: reject
                            });
                        }));

                        Promise.all(saveTasks)
                            .then(() => {
                                alert('메모등록이 완료되었습니다.');
                                textarea.value = '';
                                $t.togglePopup('verseMemoPopup', false);
                                $t.handle();
                            })
                            .catch(err => {
                                console.error('구절 메모 저장 실패', err);
                                alert('메모를 저장하지 못했습니다.\n다시 시도해주세요.');
                            });
                    },
                    error: (err) => {
                        console.error('구절 메모 조회 실패', err);
                        alert('메모를 저장하지 못했습니다.\n다시 시도해주세요.');
                    }
                });

            } else if (closeVerseMemoPopupBtn) {
                if (textarea.value.length) {
                    if (!confirm('메모 내용이 있습니다.\n그래도 취소하시겠습니까?')) return;
                    $t.toggleMemoPopup(false, () => {
                        textarea.value = '';
                    });
                } else {
                    // if (!confirm('메모를 취소하시겠습니까?')) return;
                    $t.toggleMemoPopup(false, () => {
                        textarea.value = '';
                    });
                }
            }
        });

        $t.colorPopup.addEventListener('click', e => {
            const colorBtn = e.target.closest('[data-color]');
            const setColorBtn = e.target.closest('#setColorBtn');
            const closeColorPopupBtn = e.target.closest('#closeColorPopupBtn');

            if (colorBtn) {
                const selectedScript = bibleScriptTag.querySelectorAll('[data-selected="true"]');
                selectedScript.forEach(el => {
                    el.querySelector('[data-id="bibleScript"] span').dataset.newColor = colorBtn.dataset.color;
                })
            } else if (setColorBtn || closeColorPopupBtn) {
                if (setColorBtn && !confirm('해당색상을 적용하시겠습니까?')) return;

                const targetVerses = [];

                document.querySelectorAll('[data-new-color]').forEach(el => {
                    if (setColorBtn) {
                        const color = el.dataset.newColor;
                        el.dataset.color = color;
                        //indexDB에 저장할 것

                        targetVerses.push({
                            id: el.closest('[data-bible-code]').dataset.bibleCode,
                            color: color
                        })
                    }
                    el.removeAttribute('data-new-color');
                })

                if (setColorBtn) {
                    versedb.query('m', targetVerses, {
                        success: () => {
                            alert('해당색상적용이 완료되었습니다.');
                            $t.togglePopup('colorPopup', false);
                            $t.handle();
                        }
                    })
                } else {
                    $t.togglePopup('colorPopup', false);
                }
            }
        })
    })();
}


bibleScriptTag.addEventListener('click', (e) => {
    if (e.target.closest('[data-id="delMemoBtn"]')) return; //메모삭제버튼에서는 안눌리게

    const target = e.target.closest('[data-id="verseWrapper"]');
    if (!target) return;

    selectControl.handle(+target.closest('[data-verse-no]').dataset.idx);
})


document.getElementById('allChker').addEventListener('change', e => {
    const inps = document.querySelectorAll('#bibleList input');

    if (!inps.length) {
        e.target.checked = false;
        return;
    }

    const thisDate = document.getElementById('bibleList').dataset.date;
    const targetTd = getCalendarCell(thisDate);

    targetTd.classList.remove('clear');
    targetTd.classList.remove('ing');

    const chkedData = [];

    if (e.target.checked) {
        targetTd.classList.add('clear');
        inps.forEach(inp => {
            inp.checked = true;
            chkedData.push(inp.value);
        })
    } else {
        inps.forEach(inp => {
            inp.checked = false;
        })
    }

    indexeddb.query('u', { id: thisDate, dailyChked: chkedData }, { upsert: true });

})

function calcBlockCnt(week, date) {
    const firstRowColCnt = 7 - week;

    const remindDate = date - firstRowColCnt;
    const tmpRowCnt = parseInt(remindDate / 7);
    const remindDate2 = remindDate % 7;

    const finalRowCnt = 1 + tmpRowCnt + (remindDate2 ? 1 : 0);

    return finalRowCnt;
}

function getRandomTxt(data, len) {
    let rtnVal = '';
    for (let i = 0; i < len; i++) {
        const randomIdx = Math.floor(Math.random() * (data.length - 1));


        rtnVal += data[randomIdx];
    }

    return rtnVal;
}

function appendTag(target, tagNm, option) {
    if (!['object', 'string'].includes(typeof target)) return;
    const toTarget = typeof target == 'object' ? target : document.querySelector(target);
    const tag = document.createElement(tagNm);
    if (option && option.html) tag.insertAdjacentHTML('afterbegin', option.html);
    if (option && option.attr) for (let key in option.attr) tag.setAttribute(key, option.attr[key]);
    if (option && option.class) option.class.forEach((el) => tag.classList.add(el));
    if (option && option.style) for (let key in option.style) tag.style[key] = option.style[key];
    if (option && option.fnc) for (let key in option.fnc) tag.addEventListener(key, option.fnc[key]);

    toTarget.appendChild(tag);

    return tag;
}

// 페이지 로드 후 자동으로 엑셀 파일을 불러옴
window.onload = async function () {
    indexeddb = new IndexedDB({
        dbNm: 'MyDatabase',
        dbVersion: dbVersionHistory.length + 1,
        tableNm: 'MyDailyBible',
        key: 'id'
    });
    versedb = new IndexedDB({
        dbNm: 'MyDatabase',
        dbVersion: dbVersionHistory.length + 1,
        tableNm: 'BibleVerses',
        key: 'id'
    });


    //성경 데이터 + DB 연결이 모두 끝난 뒤에 달력을 그린다
    Promise.all([getData(), indexeddb.ready, versedb.ready]).then(() => {
        dailyData2 = dailyData.map(d => ({ id: `${d.month}_${d.day}`, dailyChked: d.readings.split('/') }));
        dailyDataMap = new Map(dailyData.map(d => [`${d.month}_${d.day}`, d]));

        getCalendar('#calendar');

        // createBookList();

        DOM.loadingLayer.classList.remove('active');
    }).catch(err => {
        console.error('초기 데이터 로드 실패', err);
        DOM.loadingLayer.classList.remove('active');
        alert('데이터를 불러오지 못했습니다.\n네트워크 상태를 확인한 뒤 다시 실행해주세요.');
    });

};

// snowEffect();

function snowEffect() {
    cancelAnimationFrame(raf);
    const oldSnow = document.querySelector('[data-effect="snow"]');
    if (oldSnow) oldSnow.remove();

    const $canvas = document.createElement("canvas");
    $canvas.dataset.effect = 'snow';
    const ctx = $canvas.getContext("2d");

    const getRandomRadius = () => Math.random() * 1 + 0.5;
    const getRandomSpeed = () => Math.random() * 0.3 + 0.1;
    const getRandomDir = () => [-1, 1][Math.floor(Math.random() * 2)];

    const Snow = {
        data: [],
        canvasWidth: $canvas.clientWidth,
        canvasHeight: $canvas.clientHeight,

        init() {
            Snow.make();
            Snow.loop();
        },

        loop() {
            Snow.move();
            Snow.draw();

            raf = window.requestAnimationFrame(Snow.loop);
        },

        make() {
            const data = [];

            // 랜덤한 데이터 200개 생성
            for (let i = 0; i < 200; i++) {
                const x = Math.random() * Snow.canvasWidth;
                const y = Math.random() * Snow.canvasHeight;

                const size = getRandomRadius();
                const speed = getRandomSpeed();
                const dir = getRandomDir();

                data.push({ x, y, size, speed, dir });
            }

            // Snow 객체에 데이터 저장
            Snow.data = data;
        },

        move() {
            Snow.data = Snow.data.map((item) => {
                // 방향에 맞게 이동
                item.x += item.dir * item.speed;
                item.y += item.speed;

                // 캔버스를 벗어났는지 판단
                const isMinOverPositionX = -item.size > item.x;
                const isMaxOverPositionX = item.x > Snow.canvasWidth;
                const isOverPositionY = item.y > Snow.canvasHeight;

                // 벗어나면 반대방향, 맨 위로
                if (isMinOverPositionX || isMaxOverPositionX) {
                    item.dir *= -1;
                }
                if (isOverPositionY) {
                    item.y = -item.size;
                }

                return item;
            });
        },

        draw() {
            ctx.clearRect(0, 0, Snow.canvasWidth, Snow.canvasHeight);

            ctx.fillStyle = "transparent";
            ctx.fillRect(0, 0, Snow.canvasWidth, Snow.canvasHeight);

            Snow.data.forEach((item) => {
                ctx.beginPath();
                ctx.fillStyle = "rgba(255, 255, 255, .6)";
                ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
            });
        },
    };

    Snow.init();

    document.body.appendChild($canvas);
    $canvas.setAttribute('width', $canvas.clientWidth);
    $canvas.setAttribute('height', $canvas.clientHeight);
    Snow.canvasWidth = $canvas.clientWidth;
    Snow.canvasHeight = $canvas.clientHeight;

    $canvas.classList.add('effect');

    Snow.make();
}


function deleteDatabase() { //테스트용
    const deleteRequest = indexedDB.deleteDatabase('MyDatabase');

    deleteRequest.onsuccess = function () {
        console.log(`데이터베이스 'MyDatabase' 삭제 완료`);
    };

    deleteRequest.onerror = function (event) {
        console.error(`데이터베이스 'MyDatabase' 삭제 실패`, event.target.error);
    };

    deleteRequest.onblocked = function () {
        console.warn(`데이터베이스 'MyDatabase' 삭제가 차단되었습니다. 열려 있는 연결을 닫으세요.`);
    };
}


function addCommasToNumbers(input) {
    // 숫자 앞뒤에 쉼표 추가
    return input.replace(/(\d+)/g, (match) => `,${match},`).replace(/^,|,$/g, '');
}

document.getElementById('voiceBtn').addEventListener('click', e => {
    const target = e.currentTarget;
    if (target.dataset.status === 'playing') {
        tts.stopTTS();
        target.dataset.status = 'normal';
        return;
    }

    target.dataset.status = 'playing';

    tts.currentIndex = 0;

    if (tts.preparedUtterances.length > 0) {
        tts.currentIndex = 0;

        tts.playTTS(() => {
            target.dataset.status = 'normal';
        }, (utterance) => {
            target.dataset.status = 'playing';
        });
    }
})


window.addEventListener('beforeunload', () => {
    tts.stopTTS();
});


document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        // 탭이 백그라운드로 갔거나 화면이 꺼졌을 가능성이 있음
        tts.stopTTS();
        document.getElementById('voiceBtn').dataset.status = 'normal';
    }
});

window.addEventListener('popstate', (e) => {
    if (e.state === null) {
        selectControl.closeAllPopup();
        closePage(() => {
            document.getElementById('calendarPage').classList.remove('hidden');
        });
    } else if (e.state.type === 'page') {
        closePage(() => {
            document.getElementById('calendarPage').classList.remove('hidden');
        });
    } else {

    }
});

document.getElementById('setBibleVersion').addEventListener('click', () => {
    if (isApp) {
        openPopup('bibleVersionPopup', undefined, true);
    } else {
        alert('웹은 성경선택이 불가능합니다.');
    }
});

document.getElementById('backupBtn').addEventListener('click', () => {
    if (!confirm('데이터를 백업하시겠습니까?\n나중에 백업한 데이터를 덮어쓸 수 있습니다.')) return;

    DOM.loadingLayer.classList.add('active');

    const getHistory = () => new Promise((resolve, reject) => {
        indexeddb.query('r', null, {
            all: true,
            success: resolve,
            error: reject
        })
    })
    const getVerse = () => new Promise((resolve, reject) => {
        versedb.query('r', null, {
            all: true,
            success: resolve,
            error: reject
        })
    })

    Promise.all([getHistory(), getVerse()])
        .then(([historyData, verseData]) => {
            const backupObj = {
                version: "1.1.0",
                history: historyData,
                verse: verseData,
            }

            const json = JSON.stringify(backupObj, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = createFileName();
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            console.log('성경 기록 및 구절 데이터 통합 백업 성공!');
        })
        .catch(err => {
            console.error('백업 실패', err);
            alert('데이터 백업을 생성하지 못했습니다.');

        })
        .finally(() => {
            DOM.loadingLayer.classList.remove('active');
        })
})

document.getElementById('overwriteBtn').addEventListener('click', () => {
    const tmpInput = document.createElement('input');
    tmpInput.type = 'file';
    tmpInput.accept = '.json';
    tmpInput.style.display = 'none';
    document.body.appendChild(tmpInput);
    tmpInput.click();

    tmpInput.onchange = e => {
        const file = e.target.files[0];
        if (!file) {
            tmpInput.remove();
            return;
        }

        const reader = new FileReader();

        reader.onload = e => {
            try {
                // 1. 로딩 화면 활성화
                DOM.loadingLayer.classList.add('active');

                const jsonTxt = e.target.result;
                const jsonObj = JSON.parse(jsonTxt);

                const promiseArr = [];


                if (jsonObj.history) {
                    const historyData = new Promise((resolve, reject) => {
                        indexeddb.query('m', jsonObj.history, {
                            overwrite: true,
                            success: resolve,
                            error: reject
                        });
                    })

                    promiseArr.push(historyData);
                }
                if (jsonObj.verse) {
                    const verseData = new Promise((resolve, reject) => {
                        versedb.query('m', jsonObj.verse, {
                            overwrite: true,
                            success: resolve,
                            error: reject
                        });
                    })

                    promiseArr.push(verseData);
                }

                Promise.all(promiseArr)
                    .then(() => {
                        alert('모든 데이터를 성공적으로 불러왔습니다.');
                        window.location.reload();
                    })
                    .catch(err => {
                        console.error('복원 중 DB 저장 오류:', err);
                        alert('데이터를 불러오지 못했습니다.');
                        DOM.loadingLayer.classList.remove('active');
                    })
                    .finally(() => {
                        // DOM.loadingLayer.classList.remove('active');
                    })
            } catch (err) {
                console.error('JSON parsing 오류!', err);
                alert('올바른 백업파일이 아닙니다.');
            } finally {
                tmpInput.remove();
            }
        }

        reader.onerror = () => {
            console.error('파일을 읽는 도중 오류 발생');
            tmpInput.remove();
        }

        reader.readAsText(file, 'utf-8');
    };

    //remove()는 동기라 여기서 호출하면 파일 선택 전에 사라진다.
    //제거는 onchange/onerror 처리 안에서만 한다.
})

document.getElementById('clearDataBtn').addEventListener('click', () => {
    if (confirm('모든 데이터를 삭제하시겠습니까?')) clearData();
});
document.getElementById('downloadBtn').addEventListener('click', () => {
    const cf = confirm('어플(android)을 다운 받으시겠습니까?\nWi-Fi에 연결되지 않은 경우, 데이터 요금이 발생할 수 있습니다.');
    if (!cf) return;

    const randomInt = getRandomInt(1, 10);
    const prmt = prompt(`비밀번호를 입력해주세요.\nHint: ${randomInt}`);
    if (randomInt + 1 !== +prmt) return;

    const a = document.createElement('a');
    a.href = 'assets/download/매일성경.zip';

    a.style.display = 'none';
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

});


function setMemo(oldMemo, newMemo) {
    if (oldMemo && newMemo) {
        return `[기존동행]\n${oldMemo}\n\n\n[새동행]\n${newMemo}`;
    } else {
        return newMemo || oldMemo;
    }
}

function clearData() {
    DOM.loadingLayer.classList.add('active');

    const clearHistory = () => {
        return new Promise((resolve, reject) => {
            indexeddb.query('i', undefined, {
                success: resolve,
                error: reject
            });
        })
    }
    const clearVerse = () => {
        return new Promise((resolve, reject) => {
            versedb.query('i', undefined, {
                success: resolve,
                error: reject
            });
        })
    }

    Promise.all([clearHistory(), clearVerse()])
        .then(() => {
            alert('모든 데이터가 성공적으로 초기화되었습니다');
            window.location.reload();
        })
        .catch((error) => {
            console.error('데이터 초기화 중 에러 발생:', error);
            alert('데이터 초기화 중 일부 오류가 발생했습니다.');
            DOM.loadingLayer.classList.remove('active');
        })
        .finally(() => {
            // DOM.loadingLayer.classList.remove('active');
        })
}


document.querySelectorAll('[data-id="setFontSizeBtn"]').forEach((b) => {
    b.addEventListener('click', (e) => {
        const target = document.querySelector('[data-font]');
        const btnType = +e.currentTarget.dataset.value;
        const curValue = +target.dataset.font;
        let newValue;

        if (btnType === 0) {
            newValue = 20;
        } else {
            newValue = curValue + btnType;
        }

        if (newValue < 10) {
            alert('최소 사이즈입니다.');
            return;
        }
        if (32 < newValue) {
            alert('최대 사이즈입니다.');
            return;
        }

        window.localStorage.setItem('fontSize', newValue);
        setFontUI(newValue);

    })
})

function setFontUI(val) {
    document.querySelectorAll('[data-font]').forEach((t) => {
        t.dataset.font = val;
    })
}

document.querySelectorAll('[data-id="notYet"]').forEach((b) => {
    b.onclick = () => {
        alert('준비중입니다.');
    }
})
document.querySelectorAll('[data-id="setThemeBtn"]').forEach((b) => {
    b.addEventListener('click', e => {
        const themeVal = e.currentTarget.dataset.value;

        window.localStorage.setItem('theme', themeVal);
        document.body.dataset.theme = themeVal;
    })
});

function createFileName() {
    const now = new Date();

    const pad = (n) => n.toString().padStart(2, '0');

    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    const filename = `backup_${dateStr}_${timeStr}.json`;

    return filename;
}

function formatDateTime(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const week = ['일', '월', '화', '수', '목', '금', '토'];
    const day = week[d.getDay()];
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}. ${mm}. ${dd}(${day}) ${hh}:${min}`;
}

function createMemo(target, memo) {
    const li = document.createElement('li');

    li.innerHTML = `
        <button data-id="delMemoBtn">삭제</button>
        <div data-id="memoDate"></div>
        <div data-id="memoVerseInfo"></div>
        <p data-id="memoText"></p>
    `;

    //외부에서 복원한 백업 파일의 내용이 HTML로 해석되지 않도록 textContent로 넣는다
    li.querySelector('[data-id="memoDate"]').textContent = formatDateTime(new Date(memo.memoId));
    li.querySelector('[data-id="memoVerseInfo"]').textContent = memo.verseInfo || '';
    li.querySelector('[data-id="memoText"]').textContent = memo.text || '';

    li.querySelector('[data-id="delMemoBtn"]').onclick = (e) => {
        if (!confirm('해당메모를 삭제하시겠습니까?')) return;

        const verseId = target.closest('[data-bible-code]').dataset.bibleCode;

        versedb.query('r', verseId, {
            success: (data) => {
                const filteredMemos = data.memos.filter(d => d.memoId !== memo.memoId);

                versedb.query('u', {
                    ...data,
                    memos: filteredMemos,
                }, {
                    success: (d) => {
                        li.remove();
                        if (!filteredMemos.length) {
                            target.closest('[data-bible-code]').querySelector('[data-id="memoToggle"]').remove();
                            target.closest('[data-bible-code]').querySelector('ul').remove();

                        }
                        alert('해당메모삭제가 완료되었습니다.');
                    }
                });
            }
        })
    }

    li.dataset.memoId = memo.memoId;
    target.appendChild(li);
}

function createMemoToggleBtn(target) {
    const oldBtn = target.querySelector('[data-id="memoToggle"]');
    oldBtn?.remove();

    const label = document.createElement('label');
    label.dataset.id = ('memoToggle');
    label.classList.add('checkbox1');
    label.innerHTML = `
        <input type="checkbox" />
        <span></span>
        <strong>메모보기</strong>
    `;
    target.appendChild(label);

    label.querySelector('input').onchange = (e) => {
        const isChked = e.currentTarget.checked;
        label.closest('[data-id="verseWrapper"]').querySelector('ul').classList[isChked ? 'remove' : 'add']('hidden');
    }
}

document.getElementById('bibleVersionPopup').addEventListener('change', e => {
    window.localStorage.setItem('bibleVersion', e.target.value);
    alert('성경 버전이 변경되었습니다.');
    history.back();
})

function searchItem(content, name, cb) {
    const li = document.createElement('li');

    li.innerHTML = `
        <label>
            <input type="radio" name="${name}" />
            <strong>${content}<strong>
        </label>
    `;

    if (typeof cb === 'function') {
        li.querySelector('input').onchange = e => cb(e);
    }

    return li;
}
function createBookList() {
    const target = document.getElementById('searchBookList');

    target.innerHTML = '';

    bibleMeta.forEach(b => {
        const li = searchItem(b.name, 'searchBook');
        li.querySelector('input').dataset.id = b.id;
        target.appendChild(li);
    })
}