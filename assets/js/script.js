let dailyData;
let dailyData2;
let bibleMap = {};
let bible2Map = {};

let indexeddb;
let versedb;
let orgTxt = '';

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
    if (savedBibleVersion) document.querySelector(`input[value="${savedBibleVersion}"]`)?.checked = true;
});

async function getData() {
    const [res1, res2, res3] = await Promise.all([
        fetch('data/개역한글.json'),
        isApp ? fetch('data/개역개정.json') : undefined,
        fetch('data/guide/mccheyne.json'),
    ])

    if (!res1.ok || (isApp && !res2.ok) || !res3.ok) throw new Error('데이터 로드 실패');

    const [han, gae, guide] = await Promise.all([
        res1.json(),
        isApp ? res2.json() : undefined,
        res3.json()
    ])

    bibleMap = parseBible2Data(han);
    if (isApp) bible2Map = parseBible2Data(gae);
    dailyData = guide.data;
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

function addListItemClick(li, targets) {
    li.addEventListener('click', e => {
        const lis2 = document.querySelectorAll(targets);
        const targetLi = e.currentTarget;

        let currIdx;

        lis2.forEach((li2, idx) => {
            li2.classList.remove('active');

            if (targetLi.textContent === li2.textContent) currIdx = idx;
        });

        targetLi.closest('ul').scrollTop = (currIdx - 2) * 30;
        targetLi.classList.add('active');
    })

}

document.getElementById('yearInput').addEventListener('click', (e) => {
    openPopup('datePopup');

    const yearList = document.getElementById('yearList');

    yearList.innerHTML = '';
    for (let i = 0; i < 101; i++) {
        const li = document.createElement('li');
        //현재 연도 기준
        const thisYear = +e.currentTarget.querySelector('span').textContent;
        li.textContent = thisYear - 50 + i;

        if (i === 50) li.classList.add('active');

        addListItemClick(li, '#yearList li');

        yearList.appendChild(li);
    }

    yearList.scrollTop = 30 * 49;

    const monthList = document.querySelector('#monthList');

    monthList.querySelectorAll('li').forEach((li, idx) => {
        li.classList.remove('active');
        if (+li.textContent === +e.currentTarget.querySelector('strong').textContent) {
            li.classList.add('active');
            monthList.scrollTop = 30 * (idx - 1);
        }
    })
})

document.getElementById('yearList').addEventListener('scroll', e => {
    const currScroll = e.currentTarget.scrollTop;

    const case1 = currScroll < 1 ? 1 : currScroll + e.currentTarget.clientHeight + 1 > e.currentTarget.scrollHeight ? 2 : 0;
    if (case1 === 0) return;

    const lis = e.currentTarget.querySelectorAll('li');
    const mnYear = lis[0].textContent;
    const mxYear = lis[lis.length - 1].textContent;
    const yearCnt = 50;

    if (case1 === 1) {
        for (let i = 0; i < yearCnt; i++) {
            const li = document.createElement('li');
            const thisYear = mnYear - 1 - i;
            if (thisYear < 0) break;

            li.textContent = thisYear;

            addListItemClick(li, '#yearList li');

            yearList.prepend(li);
            yearList.scrollTop = 30 * yearCnt;
        }

    } else if (case1 === 2) {

        for (let i = 0; i < yearCnt; i++) {
            const li = document.createElement('li');
            const thisYear = +mxYear + 1 + i;

            li.textContent = thisYear;

            addListItemClick(li, '#yearList li');

            yearList.appendChild(li);
        }

    }

});

document.querySelectorAll('#monthList li').forEach(li => {
    addListItemClick(li, '#monthList li');
})

document.getElementById('applyDateBtn').addEventListener('click', () => {
    const yearList = document.getElementById('yearList');
    const monthList = document.getElementById('monthList');

    const selectedYear = yearList.querySelector('li.active');
    const selectedMonth = monthList.querySelector('li.active');

    if (!selectedYear) {
        alert('year을 선택해주세요.');
        return;
    }
    if (!selectedMonth) {
        alert('month를 선택해주세요.');
        return;
    }

    history.back();

    getCalendar('#calendar', { y: selectedYear.textContent, m: selectedMonth.textContent, d: 1 });
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

initMemoBtn.addEventListener('click', () => {
    history.back();
})

regMemoBtn.addEventListener('click', () => {
    const thisDate2 = document.getElementById('bibleList').dataset.date;
    indexeddb.query('u', { id: thisDate2, memo: textarea.value }, {
        upsert: true,
        success: () => {
            history.back();

            const targetTd = document.querySelector(`#calendar [data-date="${thisDate2.split('_')[2]}"]`);
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
    const tBodyTag = document.createElement('TBODY');
    tableTag.appendChild(tBodyTag);
    for (let i = 0; i < rowCnt; i++) {
        const trTag = appendTag(tBodyTag, 'TR');

        for (let j = 0; j < 7; j++) {
            const tdTag = appendTag(trTag, 'TD', {
                attr: { 'data-block-idx': ((i * 7) + (j + 1)) }
            });
        }
    }

    for (let i = 0; i < lastDay; i++) {
        const blockTarget = document.querySelector('[data-block-idx="' + (i + dayFirst + 1) + '"]');
        blockTarget.addEventListener('click', e => {
            cancelAnimationFrame(raf);
            const oldSnow = document.querySelector('[data-effect="snow"]');
            if (oldSnow) oldSnow.remove();

            const allBlock = document.querySelectorAll('[data-block-idx]');

            allBlock.forEach(block => block.classList.remove('on'));
            blockTarget.classList.add('on');

            const thisYear = +document.getElementById('yearInput').querySelector('span').textContent;
            const thisMonth = +document.getElementById('yearInput').querySelector('strong').textContent;
            const thisDate = +e.currentTarget.dataset.date;

            const nowData = dailyData.filter(d => d.month === thisMonth && d.day === thisDate);

            const oldBibleList = document.getElementById('bibleList');
            if (oldBibleList) oldBibleList.remove();

            const bibleListTag = document.createElement('ul');
            bibleListTag.id = 'bibleList';
            bibleListTag.classList.add('bible-list');

            const combiDate = `${thisYear}_${thisMonth}_${thisDate}`;
            bibleListTag.dataset.date = combiDate;

            document.getElementById('bibleSection').appendChild(bibleListTag);

            nowData[0].readings.split('/').forEach(d => {
                const withRange1 = d.split('-');

                if (withRange1.length === 2) {
                    const start = withRange1[0].split('b')[1];
                    const bibleCnt = +withRange1[1] - +start;
                    for (let i = 0; i < bibleCnt + 1; i++) {
                        bibleListTag.appendChild(bibleTemplate(withRange1[0].split('b')[0] + 'b' + (+start + i), d));
                    }
                } else {
                    bibleListTag.appendChild(bibleTemplate(d));
                }
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
                            bibleListTag.querySelector(`input[value="${c}"]`).checked = true;
                        })
                    }

                    bibleListTag.querySelectorAll('input').forEach(input => {
                        if (!input.checked) isAllChked = false;
                    })

                    if (isAllChked) document.getElementById('allChker').checked = true;
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
        const redTarget = document.querySelector('[data-block-idx="' + ((i * 7) + 1) + '"]');
        const blueTarget = document.querySelector('[data-block-idx="' + ((i * 7) + 7) + '"]');

        // if(redTarget) redTarget.style.color = '#f0f';
        // if(blueTarget) blueTarget.style.color = '#0ff';

        if (redTarget && redTarget.querySelector('strong')) redTarget.querySelector('strong').classList.add('sun');
        if (blueTarget && blueTarget.querySelector('strong')) blueTarget.querySelector('strong').classList.add('sat');
    }

    const nowD2 = new Date();
    if (+nowD2.getFullYear() === +document.getElementById('yearInput').querySelector('span').textContent
        && +(nowD2.getMonth() + 1) === +document.getElementById('yearInput').querySelector('strong').textContent) {
        const todayTarget = document.querySelector('[data-date="' + nowD2.getDate() + '"]');
        todayTarget.querySelector('strong').classList.add('today');
    }

    if (!setDate) {   //투데이 자동 클릭
        setTimeout(() => {
            const todayTarget = document.querySelector('[data-date="' + nowD + '"]');
            todayTarget.click();
        })
    }

    indexeddb.query('r', undefined, {
        like: `${date.getFullYear()}_${date.getMonth() + 1}_`,
        success: (data) => {
            const mapedData = data.map(d => {
                const copyId = d.id.split('_').slice(1);
                return copyId.join('_');
            })
            const mapedData2 = data.map(d => {
                const copyId = d.id.split('_').slice(1);
                return { ...d, id: copyId.join('_') };
            })

            const set = new Set(mapedData);
            const targetData = dailyData2.filter(d => set.has(d.id));

            const mapedDataMap = new Map(mapedData2.map(item => [item.id, item]));

            targetData.forEach(dd => {
                const targetD = mapedDataMap.get(dd.id);

                if (!targetD) return;
                const withRange1 = dd.dailyChked.filter(d => d.indexOf('-') > -1);

                withRange1.forEach(wr => {
                    dd.dailyChked = dd.dailyChked.filter(ddd => ddd !== wr);
                    const parsedData = wr.split('b');
                    const ranged = parsedData[1].split('-');
                    const bookCnt = +ranged[1] - +ranged[0];

                    const splittedArr = [];
                    for (let i = 0; i < (bookCnt + 1); i++) {
                        splittedArr.push(parsedData[0] + 'b' + (+ranged[0] + i));
                    }

                    dd.dailyChked = [...dd.dailyChked, ...splittedArr];
                })
            })

            //가공 후
            mapedData2.forEach(d => {   //여기서 다 담아라
                if (d.dailyChked && d.dailyChked.length > 0) {
                    let clsNm = 'ing';
                    if (isEqualArr(d.dailyChked, targetData.filter(td => td.id === d.id)[0].dailyChked)) clsNm = 'clear';
                    document.querySelector(`#calendar td[data-date="${d.id.split('_')[1]}"]`).classList.add(clsNm);
                }

                if (d.memo) {
                    document.querySelector(`#calendar td[data-date="${d.id.split('_')[1]}"]`).classList.add('has-memo');
                }
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

        const targetTd = document.querySelector(`#calendar [data-date="${thisDate.split('_')[2]}"]`);

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
    li.querySelector('button').addEventListener('click', e => {
        const bibleVersion = isApp ? (window.localStorage.getItem('bibleVersion') || 'han') : 'han';

        openPage('biblePage');

        const targetInput = e.currentTarget.closest('li').querySelector('input');

        document.querySelector('#biblePage input').checked = targetInput.checked;

        document.querySelector('#biblePage input').onchange = e => {
            targetInput.checked = e.currentTarget.checked;
            const changeEvent = new Event('change');
            targetInput.dispatchEvent(changeEvent);
        };

        const parseData = d.split('b');

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

        (bibleVersion === 'han' ? thisBible : thisBible2).forEach((dd, idx) => {
            // const tr = document.createElement('tr');
            // tr.dataset.verseNo = dd.VerseNo;
            // tr.innerHTML = `
            //     <th>${dd.VerseNo}</th>
            //     <td class="">${dd.BibleScript}</td>
            // `;
            const div = document.createElement('div');
            div.dataset.verseNo = dd.VerseNo;
            div.dataset.idx = idx;
            div.dataset.bibleCode = d + ':' + dd.VerseNo;

            div.innerHTML = `
                <div class="verse-wrapper" data-id="verseWrapper">
                    <div class="verse-top-wrapper" data-id="verseTopWrapper">
                        <div class="verse-no">${dd.VerseNo}</div>
                    </div>
                    <div data-id="bibleScript"><span>${dd.BibleScript}</span></div>
                </div>
            `;
            bibleScriptTag.appendChild(div);

            tts.pushArray(tts.createSpeechUtterance(dd.VerseNo, dd.BibleScript));
        });

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

            selectedScript.forEach((el) => {
                txt += '\n' + el.dataset.verseNo + ' ' + el.querySelector('[data-id="bibleScript"]').textContent.trim();
            })

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

                versedb.query('r', targetIds, {
                    success: (data) => {
                        targetIds.forEach(targetId => {
                            const oldData = data.find(item => item.id === targetId) || { id: targetId };
                            const oldMemos = oldData.memos && Array.isArray(oldData.memos) ? oldData.memos : [];
                            oldMemos.push({
                                memoId: now.getTime(),
                                verseInfo: verseInfo2,
                                text: textarea.value
                            });

                            versedb.query('u', {
                                ...oldData,
                                memos: oldMemos,
                            }, {
                                upsert: true,
                                success: (d) => {
                                    const wrapper = document.querySelector(`[data-bible-code="${d}"] [data-id="verseWrapper"]`);
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
                                }
                            });
                        })

                        alert('메모등록이 완료되었습니다.');
                        textarea.value = '';
                        $t.togglePopup('verseMemoPopup', false);
                        $t.handle();
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
    const targetTd = document.querySelector(`#calendar [data-date="${thisDate.split('_')[2]}"]`);

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


    getData().then(() => {
        dailyData2 = dailyData.map(d => ({ id: `${d.month}_${d.day}`, dailyChked: d.readings.split('/') }));

        getCalendar('#calendar');

        DOM.loadingLayer.classList.remove('active');
    }).catch(err => {
        console.log(err);
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


    tmpInput.remove();
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


// 신규 - 배열 대신 Map으로 빌드, 보기 클릭 시 O(1) 조회
function parseBible2Data(data) {
    const rtnMap = {};
    let tmpBibleName = '';
    let bibleId = 0;
    let bibleIdx = 0;

    for (let key in data) {
        bibleIdx = isNaN(key[1]) ? 2 : 1;
        if (tmpBibleName !== key.slice(0, bibleIdx)) {
            tmpBibleName = key.slice(0, bibleIdx);
            bibleId++;
        }
        const jj = key.slice(bibleIdx).split(':'); //장절
        const mapKey = `${bibleId}_${jj[0]}`;
        if (!rtnMap[mapKey]) rtnMap[mapKey] = [];
        rtnMap[mapKey].push({ VerseNo: +(jj[1]), BibleScript: data[key] });
    }

    return rtnMap;
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
        <div data-id="memoDate">${formatDateTime(new Date(memo.memoId))}</div>
        <div data-id="memoVerseInfo">${memo.verseInfo}</div>
        <p data-id="memoText">${memo.text}</p>
    `;

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
    alert('성경 버전이 변경되었습니다');
    history.back();
})