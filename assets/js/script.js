let dailyData;
let dailyData2;
let bible;

let indexeddb;
let orgTxt = '';

const valueObj = {
    m_e: 'm',
    d_e: 'd',
    r_e: 'where',
    m_k: '월',
    d_k: '일',
    r_k: '어디',
}

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

function openPopup(popupId, cb){
    closePopup();
    document.getElementById('dimLayer').classList.add('active');
    document.getElementById(popupId).classList.add('active');

    if(cb && typeof cb === 'function') cb();
}

function closePopup(cb){
    document.getElementById('dimLayer').classList.remove('active');
    document.getElementById('datePopup').classList.remove('active');
    document.getElementById('biblePopup').classList.remove('active');
    document.getElementById('memoPopup').classList.remove('active');

    if(cb && typeof cb === 'function') cb();
}

document.querySelectorAll('[data-id="closePopupBtn"]').forEach(btn => {
    btn.addEventListener('click', closePopup);
})

document.getElementById('todayBtn').addEventListener('click', () => {
    getCalendar('#calendar');
})

document.getElementById('yearInput').addEventListener('click', (e) => {
    openPopup('datePopup');

    const yearList = document.getElementById('yearList');

    yearList.innerHTML = '';
    for (let i = 0; i < 101; i++) {
        const li = document.createElement('li');
        //현재 연도 기준
        const thisYear = +e.currentTarget.querySelector('span').textContent;
        li.textContent = thisYear - 50 + i;

        if(i === 50) li.classList.add('active');

        li.addEventListener('click', e => {
            const lis2 = document.querySelectorAll('#yearList li');
            const targetLi = e.currentTarget;

            let currIdx;

            lis2.forEach((li2, idx) => {
                li2.classList.remove('active');

                if (targetLi.textContent === li2.textContent) currIdx = idx;
            });

            targetLi.closest('ul').scrollTop = (currIdx - 1) * 30;
            targetLi.classList.add('active');
        })

        yearList.appendChild(li);
    }

    yearList.scrollTop = 30 * 49;

    const monthList = document.querySelector('#monthList');

    monthList.querySelectorAll('li').forEach((li, idx) => {
        li.classList.remove('active');
        if(+li.textContent === +e.currentTarget.querySelector('strong').textContent){
            li.classList.add('active');
            monthList.scrollTop = 30 * (idx - 1);
        }
    })
})

document.getElementById('yearList').addEventListener('scroll', e => {
    const currScroll = e.currentTarget.scrollTop;
    const lis = e.currentTarget.querySelectorAll('li');
    const mnYear = lis[0].textContent;
    const mxYear = lis[lis.length - 1].textContent;
    const yearCnt = 50;

    if (currScroll < 1) {
        for (let i = 0; i < yearCnt; i++) {
            const li = document.createElement('li');
            const thisYear = mnYear - 1 - i;
            if (thisYear < 0) break;

            li.textContent = thisYear;

            li.addEventListener('click', e => {
                const lis2 = document.querySelectorAll('#yearList li');
                const targetLi = e.currentTarget;

                let currIdx;

                lis2.forEach((li2, idx) => {
                    li2.classList.remove('active');

                    if (targetLi.textContent === li2.textContent) currIdx = idx;
                });

                targetLi.closest('ul').scrollTop = (currIdx - 1) * 30;
                targetLi.classList.add('active');
            })

            yearList.prepend(li);
            yearList.scrollTop = 30 * yearCnt;
        }

    } else if (currScroll + e.currentTarget.clientHeight + 1 > e.currentTarget.scrollHeight) {

        for (let i = 0; i < yearCnt; i++) {
            const li = document.createElement('li');
            const thisYear = +mxYear + 1 + i;

            li.textContent = thisYear;

            li.addEventListener('click', e => {
                const lis2 = document.querySelectorAll('#yearList li');
                const targetLi = e.currentTarget;

                let currIdx;

                lis2.forEach((li2, idx) => {
                    li2.classList.remove('active');

                    if (targetLi.textContent === li2.textContent) currIdx = idx;
                });

                targetLi.closest('ul').scrollTop = (currIdx - 1) * 30;
                targetLi.classList.add('active');
            })

            yearList.appendChild(li);
        }

    }

});

document.querySelectorAll('#monthList li').forEach(li => {
    li.addEventListener('click', e => {
        const lis = document.querySelectorAll('#monthList li');
        const targetLi = e.currentTarget;

        let currIdx;

        lis.forEach((li2, idx) => {
            li2.classList.remove('active');

            if (targetLi.textContent === li2.textContent) currIdx = idx;
        });

        targetLi.closest('ul').scrollTop = (currIdx - 1) * 30;
        targetLi.classList.add('active');
    })

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

    closePopup();

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

const textarea = document.querySelector('#memoPopup textarea');
const regMemoBtn = document.getElementById('regMemoBtn');
const regSection = document.getElementById('regSection');
const modOnBtn = document.getElementById('modOnBtn');


modOnBtn.addEventListener('click', () => {
    regSection.classList.remove('hidden');
    modOnBtn.classList.add('hidden');
    textarea.removeAttribute('disabled');
    setTimeout(() => {
        textarea.focus();
    }, 200);
});

initMemoBtn.addEventListener('click', () => {
    modOnBtn.classList.remove('hidden');
    regSection.classList.add('hidden');
    textarea.value = orgTxt;
    textarea.disabled = true;
})

regMemoBtn.addEventListener('click', () => {
    const thisDate2 = document.getElementById('bibleList').dataset.date;
    indexeddb.query('u', {id: thisDate2, memo: textarea.value}, {
        upsert: true,
        success: () => {
            orgTxt = textarea.value;
            initMemoBtn.click();
        }
    });
})


async function fetchAndReadExcel(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('엑셀 파일을 가져오는 데 실패했습니다.');
        }

        // 엑셀 파일을 Blob으로 변환
        const fileBlob = await response.blob();

        // Blob을 읽을 수 있도록 파일을 처리
        const fileData = await fileBlob.arrayBuffer();

        // 엑셀 파일을 읽음
        const wb = XLSX.read(fileData, { type: 'array' });

        // 엑셀 시트 데이터 처리
        let rtnData;

        wb.SheetNames.forEach(function (sheetName, idx) {
            // const rowObj = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
            // console.log(`Sheet Name${idx}: ${sheetName}`, rowObj);
            rtnData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
        });

        return rtnData;

    } catch (error) {
        console.error('엑셀 파일을 읽는 중 오류 발생:', error);
        alert('데이터 불러오는데 실패했습니다.\n다시 불러올게요.');
        window.location.reload();
    }
}

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
                    if(verses[0].split(':')[1] === verses[1]){
                        finalTxt += ' ' + verses[1] + '절';
                    }else{
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

function getCalendar(target, setDate) {
    const calendarTarget = typeof target == 'object' ? target : document.querySelector(target);

    //ui초기화
    calendarTarget.innerHTML = '';

    const colWidth = 100 / 7;
    const dateKr = ['일', '월', '화', '수', '목', '금', '토'];
    const date = setDate ? new Date(setDate.y, setDate.m - 1, setDate.d) : new Date();
    const randomTxt = getRandomTxt('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 10);
    const thisMonth = date.getMonth() + 1;
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
            const allBlock = document.querySelectorAll('[data-block-idx]');

            allBlock.forEach(block => block.classList.remove('on'));
            blockTarget.classList.add('on');

            const thisYear = +document.getElementById('yearInput').querySelector('span').textContent;
            const thisMonth = +document.getElementById('yearInput').querySelector('strong').textContent;
            const thisDate = +e.currentTarget.dataset.date;

            const nowData = dailyData.filter(d => d[valueObj.m_k] === thisMonth && d[valueObj.d_k] === thisDate);

            const oldBibleList = document.getElementById('bibleList');
            if(oldBibleList) oldBibleList.remove();

            const bibleListTag = document.createElement('ul');
            bibleListTag.id = 'bibleList';
            bibleListTag.classList.add('bible-list');

            const combiDate = `${thisYear}_${thisMonth}_${thisDate}`;
            bibleListTag.dataset.date = combiDate;

            document.getElementById('bibleSection').appendChild(bibleListTag);

            nowData[0][valueObj.r_k].split('/').forEach(d => {
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
                memoBtn.textContent = `메모`;

                memoBtn.addEventListener('click', () => {
                    openPopup('memoPopup', () => {
                        const thisDate = document.getElementById('bibleList').dataset.date;
                        textarea.value = '';
                        textarea.removeAttribute('disabled');
                        modOnBtn.classList.remove('hidden');
                        regSection.classList.remove('hidden');
                        document.querySelector('#memoPopup h3').textContent = `메모(${thisDate.replaceAll('_', '-')})`;

                        indexeddb.query('r', thisDate, {success: (d) => {

                            if(d && d.memo !== undefined && d.memo !== ''){ //값이 있음
                                orgTxt = d.memo;
                                textarea.value = d.memo;
                                textarea.disabled = true;
                                regSection.classList.add('hidden');
                            }else{  //값이 없음
                                regSection.classList.remove('hidden');
                                modOnBtn.classList.add('hidden');
                                setTimeout(() => {
                                    textarea.focus();
                                }, 200);
                            }
                        }});
                    });
                })
                
                return memoBtn;
            }

            const oldMemo = document.querySelector('[data-id="memoBtn"]');
            if(oldMemo) oldMemo.remove();

            document.body.querySelector(':scope > main').appendChild(memo());

            //저장된 데이터 처리
            document.getElementById('allChker').checked = false;
            let isAllChked = true;

            indexeddb.query('r', combiDate, {success: (d) => {
                if(!d) return;

                if(d && d.dailyChked){
                    d.dailyChked.forEach((c) => {
                        bibleListTag.querySelector(`input[value="${c}"]`).checked = true;
                    })
                }
                
                bibleListTag.querySelectorAll('input').forEach(input => {
                    if(!input.checked) isAllChked = false;
                })
    
                if(isAllChked) document.getElementById('allChker').checked = true;
            }});

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
    if(+nowD2.getFullYear() === +document.getElementById('yearInput').querySelector('span').textContent
    && +(nowD2.getMonth() + 1) === +document.getElementById('yearInput').querySelector('strong').textContent){
        const todayTarget = document.querySelector('[data-date="' + nowD2.getDate() + '"]');
        todayTarget.querySelector('strong').classList.add('today');
    }

    if (!setDate) {   //투데이 자동 클릭
        setTimeout(() => {
            todayTarget = document.querySelector('[data-date="' + nowD + '"]');
            todayTarget.click();
        })
    }

    indexeddb.query('r', undefined, {
        where: (d) => {
            return d.id.indexOf(`${date.getFullYear()}_${date.getMonth() + 1}`) === 0
        },
        success: (data) => {
            const mapedData = data.map(d => {
                const copyId = d.id.split('_').slice(1);
                return copyId.join('_');
            })
            const mapedData2 = data.map(d => {
                const copyId = d.id.split('_').slice(1);
                return {...d, id: copyId.join('_')};
            })

            const set = new Set(mapedData);
            const targetData = dailyData2.filter(d => set.has(d.id));

            targetData.forEach(dd => {
                const targetD = mapedData2.filter(ddd => ddd.id === dd.id)[0];
                const withRange1 = dd.dailyChked.filter(d => d.indexOf('-') > -1);

                withRange1.forEach(wr => {
                    dd.dailyChked = dd.dailyChked.filter(ddd => ddd !== wr);
                    const parsedData = wr.split('b');
                    const ranged = parsedData[1].split('-');
                    const bookCnt = +ranged[1] - +ranged[0];
                    
                    const splittedArr = [];
                    for(let i = 0; i < (bookCnt + 1); i++){
                        splittedArr.push(parsedData[0] + 'b' + (+ranged[0] + i));
                    }

                    dd.dailyChked = [...dd.dailyChked, ...splittedArr];
                })
            })

            //가공 후
            // console.log('체크해야할 것: ', targetData, '체크된 것: ', mapedData2);
            mapedData2.forEach(d => {
                if(d.dailyChked && d.dailyChked.length > 0){
                    let clsNm = 'ing';
                    if(isEqualArr(d.dailyChked, targetData.filter(td => td.id === d.id)[0].dailyChked)) clsNm = 'clear';
                    document.querySelector(`#calendar td[data-date="${d.id.split('_')[1]}"]`).classList.add(clsNm);
                }
            })

            function isEqualArr(a, b) {
                const setA = new Set(a);
                const setB = new Set(b);
            
                if (setA.size !== setB.size) return false; // 원소 개수가 다르면 바로 false
                for (let item of setA) {
                    if (!setB.has(item)) return false; // 하나라도 없다면 false
                }
                return true;
            }
        }
    });

    const oldBibleList = document.getElementById('bibleList');
    if(oldBibleList) oldBibleList.remove();

    document.getElementById('allChker').checked = false;
}

function bibleTemplate(d, org) {
    const li = document.createElement('li');
    li.innerHTML = `
        <div>
            <label class="checkbox1">
                <input type="checkbox" value="${d}" data-id="chkRead" />
                <span></span>
                <strong class="bible-range">${parseBook(d)}</strong>
            </label>
            <button>보기</button>
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
            if(!inp.checked){
                isAllChked = false;
            }else{
                chkedData.push(inp.value);
                chkedCnt++;
            }
        })
        
        const targetTd = document.querySelector(`#calendar [data-date="${thisDate.split('_')[2]}"]`);

        targetTd.classList.remove('clear');
        targetTd.classList.remove('ing');

        if(chkedCnt === inputs.length){ //완료
            targetTd.classList.add('clear');
        }else if(chkedCnt > 0){  //진행중
            targetTd.classList.add('ing');
        }

        document.getElementById('allChker').checked = isAllChked;

        indexeddb.query('u', {id: thisDate, dailyChked: chkedData}, {upsert: true});

    })

    li.querySelector('button').addEventListener('click', e => {
        openPopup('biblePopup');

        const targetInput = e.currentTarget.closest('li').querySelector('input');

        const isChked = targetInput.checked;
        document.querySelector('#biblePopup input').checked = isChked;

        document.querySelector('#biblePopup input').onchange = e => {
            targetInput.checked = e.currentTarget.checked;
            const changeEvent = new Event('change');
            targetInput.dispatchEvent(changeEvent);
        };

        const parseData = d.split('b');

        let thisBible;

        const ranged2 = parseData[1].split(':');

        if(ranged2.length === 2){
            const chapter = +ranged2[0];
            const verse = ranged2[1];

            thisBible = bible.filter(bs => {
                return +bs.BibleID === +parseData[0]
                && +bs.ChapterNo === chapter
                && (verse.split('~')[0] <= bs.VerseNo) 
                && (bs.VerseNo <= verse.split('~')[1]) 
            });

        }else{
            thisBible = bible.filter(bs => +bs.BibleID === +parseData[0] && +bs.ChapterNo === +parseData[1]);
        }
        
        document.getElementById('bibleName').textContent = parseBook(d);
    
        document.getElementById('bibleScript').innerHTML = '';
        document.getElementById('bibleScript').scrollTop = 0;
    
        thisBible.forEach(dd => {
            const span = document.createElement('span');
            span.innerHTML = `<strong>${dd.VerseNo}</strong> ${dd.BibleScript}`;
            document.getElementById('bibleScript').appendChild(span);
        });

    })

    return li;
}

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
    }else{
        inps.forEach(inp => {
            inp.checked = false;
        })
    }
    
    indexeddb.query('u', {id: thisDate, dailyChked: chkedData}, {upsert: true});

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
    const toTarget = typeof target == 'object' ? target : document.querySelector('target');
    const tag = document.createElement(tagNm);
    if (option && option.html) tag.insertAdjacentHTML('afterbegin', option.html);
    if (option && option.attr) for (key in option.attr) tag.setAttribute(key, option.attr[key]);
    if (option && option.class) option.class.forEach((el) => tag.classList.add(el));
    if (option && option.style) for (key in option.style) tag.style[key] = option.style[key];
    if (option && option.fnc) for (key in option.fnc) tag.addEventListener(key, option.fnc[key]);

    toTarget.appendChild(tag);

    return tag;
}

// 페이지 로드 후 자동으로 엑셀 파일을 불러옴
window.onload = async function () {
    indexeddb = new IndexedDB({
        dbNm: 'MyDatabase',
        dbVersion: 1,
        tableNm: 'MyDailyBible',
        key: 'id'
    });

    dailyData = await fetchAndReadExcel('./data/daily-data.xlsx');  // 페이지 로드 시 자동으로 엑셀 파일을 읽음
    bible = await fetchAndReadExcel('./data/bible-kr.xlsb');  // 페이지 로드 시 자동으로 엑셀 파일을 읽음
    dailyData2 = dailyData.map(d => ({id: `${d[valueObj.m_k]}_${d[valueObj.d_k]}`, dailyChked: d[valueObj.r_k].split('/')}));

    // console.log(dailyData);
    // console.log(dailyData2);
    // console.log(bible);

    getCalendar('#calendar');

    document.getElementById('loadingLayer').classList.remove('active');
};


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