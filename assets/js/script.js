let dailyData;
let dailyData2;
let bible;  //개역한글
let bible2; //개역개정(현재 obj)
let bible2Arr = []

let indexeddb;
let orgTxt = '';

let bibleType = {
    1: false,
    2: true
}

const valueObj = {
    m_e: 'm',
    d_e: 'd',
    r_e: 'where',
    m_k: '월',
    d_k: '일',
    r_k: '어디',
}

let bookName;
let raf;

const preparedUtterances = [];

const tts = new TTS();

// getData();

window.addEventListener('DOMContentLoaded', () => {
    if(!tts.isSupported) document.getElementById('voiceBtn').classList.add('hidden');
    if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
});

async function getData(){
    bookName = [
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

    const res1 = await fetch('data/bible.json');
    if (!res1.ok) throw new Error('Network response was not ok');
    bible = await res1.json();

    
    const res2 = await fetch('data/bible2.json');
    if (!res1.ok) throw new Error('Network response was not ok');
    bible2 = await res2.json();

    bible2Arr = parseBible2Data(bible2);

    const res3 = await fetch('data/dailyData.json');
    if (!res2.ok) throw new Error('Network response was not ok');
    dailyData = await res3.json();
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

function getRandomInt(mn, mx){
    return Math.floor(Math.random() * (mx - mn + 1)) + mn;
}

function openPopup(popupId, cb){
    closePopup();

    location.hash = popupId;

    document.getElementById('dimLayer').classList.add('active');
    document.getElementById(popupId).classList.add('active');

    if(cb && typeof cb === 'function') cb();
}

function closePopup(cb){
    tts.stopTTS();
    document.querySelectorAll('[data-verse-no]').forEach((v) => {
        v.classList.remove('active');
    })

    // document.getElementById('voiceBtn').dataset.status = 'normal';
    if(tts.preparedUtterances.length) document.getElementById('voiceBtn').dataset.status = 'normal';

    document.getElementById('dimLayer').classList.remove('active');
    document.getElementById('datePopup').classList.remove('active');
    document.getElementById('biblePopup').classList.remove('active');
    document.getElementById('memoPopup').classList.remove('active');
    document.getElementById('menuPopup').classList.remove('active');

    if(cb && typeof cb === 'function') cb();
}

document.getElementById('dimLayer').addEventListener('click', e => {
    if(e.target === e.currentTarget) history.back();
})

document.querySelectorAll('[data-id="closePopupBtn"]').forEach(btn => {
    btn.addEventListener('click', () => {
        history.back();
    });
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
    // openPopup('menuPopup', () => {
    //     const btn = document.getElementById('chkAllDataBtn');
    //     const thisYear = document.getElementById('yearInput').querySelector('span').textContent;
    //     const thisMonth = document.getElementById('yearInput').querySelector('strong').textContent;
    //     btn.querySelector('strong').textContent = thisMonth;

    //     btn.dataset.month = thisMonth;
    //     btn.dataset.year = thisYear;
    // });
    openPopup('menuPopup', () => {
        
    });
})

// document.querySelectorAll('#menuPopup [name="bibleType"]').forEach((bt) => {
//     bt.addEventListener('change', (e) => {
//         const val = e.target.value;
//         const isChked = e.target.checked;
        
//         bibleType[val] = isChked;

//         let anyChked = isChked;

//         if(!isChked){
//             for(let key in bibleType){
//                 if(bibleType[key]) anyChked = true;
//             }
//         }

//         if(!anyChked){
//             alert('적어도 1개는 선택되어야 합니다.');
//             e.target.checked = !isChked;
//             bibleType[val] = !bibleType[val];
//         }

//         window.localStorage.setItem('bibleType', JSON.stringify(bibleType));
//     })
// })



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
    history.back();
})

regMemoBtn.addEventListener('click', () => {
    const thisDate2 = document.getElementById('bibleList').dataset.date;
    indexeddb.query('u', {id: thisDate2, memo: textarea.value}, {
        upsert: true,
        success: () => {
            history.back();
            
            const targetTd = document.querySelector(`#calendar [data-date="${thisDate2.split('_')[2]}"]`);
            const memoBtn = document.querySelector('[data-id="memoBtn"]');

            if(textarea.value !== ''){
                memoBtn.classList.add('has-memo');
                targetTd.classList.add('has-memo');
            }else{
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
            cancelAnimationFrame(raf);
            const oldSnow = document.querySelector('[data-effect="snow"]');
            if(oldSnow) oldSnow.remove();

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
                memoBtn.textContent = `동행`;

                memoBtn.addEventListener('click', () => {
                    openPopup('memoPopup', () => {
                        const thisDate = document.getElementById('bibleList').dataset.date;
                        textarea.value = '';
                        textarea.removeAttribute('disabled');
                        modOnBtn.classList.remove('hidden');
                        regSection.classList.remove('hidden');
                        document.querySelector('#memoPopup h3').innerHTML = `동행<span>(${thisDate.replaceAll('_', '.')})</span>`;

                        orgTxt = '';

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

                if(d && d.memo !== undefined && d.memo !== ''){
                    document.querySelector('[data-id="memoBtn"]').classList.add('has-memo');
                }

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

            if(thisMonth === 12 && thisDate === 25){
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
            mapedData2.forEach(d => {   //여기서 다 담아라
                if(d.dailyChked && d.dailyChked.length > 0){
                    let clsNm = 'ing';
                    if(isEqualArr(d.dailyChked, targetData.filter(td => td.id === d.id)[0].dailyChked)) clsNm = 'clear';
                    document.querySelector(`#calendar td[data-date="${d.id.split('_')[1]}"]`).classList.add(clsNm);
                }
                
                if(d.memo){
                    document.querySelector(`#calendar td[data-date="${d.id.split('_')[1]}"]`).classList.add('has-memo');
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

    //이부분이 [보기]버튼 눌렀을 때
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

        let thisBible;  //개역한글
        let thisBible2; //개역개정

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
            thisBible2 = bible2Arr.filter(bs => {
                return +bs.BibleID === +parseData[0]
                && +bs.ChapterNo === chapter
                && (verse.split('~')[0] <= bs.VerseNo) 
                && (bs.VerseNo <= verse.split('~')[1]) 
            });
        }else{
            thisBible = bible.filter(bs => +bs.BibleID === +parseData[0] && +bs.ChapterNo === +parseData[1]);
            thisBible2 = bible2Arr.filter(bs => +bs.BibleID === +parseData[0] && +bs.ChapterNo === +parseData[1]);
        }
        
        document.getElementById('bibleName').textContent = parseBook(d);
    
        document.getElementById('bibleScript').innerHTML = '';
        document.getElementById('bibleScript').scrollTop = 0;

        tts.initData();

        thisBible.forEach((dd, idx) => {
            const li = document.createElement('li');
            li.dataset.verseNo = dd.VerseNo;
            li.innerHTML = `
                <strong>${dd.VerseNo}</strong>
                <div>
                    <p class="${bibleType[1] ? '' : 'hidden'}">${dd.BibleScript}</p>
                    <p class="${bibleType[2] ? '' : 'hidden'}">${thisBible2[idx].BibleScript}</p>
                </div>
            `;
            document.getElementById('bibleScript').appendChild(li);
            
            tts.pushArray(tts.createSpeechUtterance(dd.VerseNo, dd.BibleScript));
        });

    
        if(tts.preparedUtterances.length) document.getElementById('voiceBtn').dataset.status = 'normal';
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

    // const curBibleType = window.localStorage.getItem('bibleType');

    // if(curBibleType){
    //     bibleType = JSON.parse(curBibleType);

    //     for(let key in bibleType){
    //         document.querySelector('#menuPopup [value="' + key + '"]').checked = bibleType[key];
    //     }
    // }else{
    //     window.localStorage.setItem('bibleType', JSON.stringify({1: true, 2: false}));
    //     document.querySelector('#menuPopup [value="1"]').checked = true;
    // }

    getData().then(() => {
        dailyData2 = dailyData.map(d => ({id: `${d[valueObj.m_k]}_${d[valueObj.d_k]}`, dailyChked: d[valueObj.r_k].split('/')}));
    
        getCalendar('#calendar');
    
        document.getElementById('loadingLayer').classList.remove('active');
    });

};

// snowEffect();

function snowEffect(){
    cancelAnimationFrame(raf);
    const oldSnow = document.querySelector('[data-effect="snow"]');
    if(oldSnow) oldSnow.remove();

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


// if (!Kakao.isInitialized()) {
//     Kakao.init('e14b339e334e3a9bb5d3a6b66a9859fa'); // 사용하려는 앱의 JavaScript 키 입력
// }

// document.getElementById('shareBtn').addEventListener('click', () => {
//     Kakao.Share.sendDefault({
//         objectType: 'feed',
//         content: {
//         title: '매일성경',
//         description: `#매일성경 #매일감동 #일상`,
//         link: {
//             // [내 애플리케이션] > [플랫폼] 에서 등록한 사이트 도메인과 일치해야 함
//             mobileWebUrl: 'https://developers.kakao.com',
//             webUrl: 'https://developers.kakao.com',
//         },
//         },
        
//         buttons: [
//         {
//             title: '읽기',
//             link: {
//             mobileWebUrl: 'https://wondaero.github.io/daily-bible',
//             webUrl: 'https://wondaero.github.io/daily-bible',
//             },
//         },
//         ],
//     });
// })


function addCommasToNumbers(input) {
    // 숫자 앞뒤에 쉼표 추가
    return input.replace(/(\d+)/g, (match) => `,${match},`).replace(/^,|,$/g, '');
}

document.getElementById('voiceBtn').addEventListener('click', e => {
    const target = e.currentTarget;
    if(target.dataset.status === 'playing'){
        tts.stopTTS();
        document.querySelectorAll('[data-verse-no]').forEach((v) => {
            v.classList.remove('active');
        })
        target.dataset.status = 'normal';
        return;
    }

    target.dataset.status = 'playing';

    tts.currentIndex = 0;

    if (tts.preparedUtterances.length > 0) {
        tts.currentIndex = 0;

        tts.playTTS(() => {
            target.dataset.status = 'normal';
            document.querySelectorAll('[data-verse-no]').forEach((v) => {
                v.classList.remove('active');
                if(v.dataset.verseNo === verseNo) v.classList.add('active');
            })
        }, (utterance) => {
            target.dataset.status = 'playing';
            const verseNo = utterance.text.split('!,')[0];
            
            document.querySelectorAll('[data-verse-no]').forEach((v) => {
                v.classList.remove('active');
                if(v.dataset.verseNo === verseNo) v.classList.add('active');
            })
        });
    }
})


window.addEventListener('beforeunload', () => {
    tts.stopTTS();
    document.querySelectorAll('[data-verse-no]').forEach((v) => {
        v.classList.remove('active');
    })
});


document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        // 탭이 백그라운드로 갔거나 화면이 꺼졌을 가능성이 있음
        tts.stopTTS();
        document.querySelectorAll('[data-verse-no]').forEach((v) => {
            v.classList.remove('active');
        })
        document.getElementById('voiceBtn').dataset.status = 'normal';
    }
});


// 해시 변경 감지
window.addEventListener('hashchange', () => {
    if(!window.location.hash) closePopup();
});


document.getElementById('backupBtn').addEventListener('click', () => {
    const cf = confirm('데이터를 백업하시겠습니까?\n나중에 백업한 데이터를 덮어쓸 수 있습니다.');
    if(cf) indexeddb.query('b');
})

document.getElementById('overwriteBtn').addEventListener('click', () => {
    const tmpInput = document.createElement('input');
    tmpInput.type = 'file';
    tmpInput.accept = '.json';
    document.body.appendChild(tmpInput);
    tmpInput.click();

    tmpInput.onchange = e => {
        const file = e.target.files[0];
        if(!file){
            tmpInput.remove();
            return;
        }

        const reader = new FileReader();

        reader.onload = e => {
            try{
                const jsonTxt = e.target.result;
                const jsonObj = JSON.parse(jsonTxt);

                indexeddb.query('o', undefined, {
                    success: (d) => {
                        const toUpdateData = [];    //나중에 업데이트 예정
                        let merged = [...d];  //기존 데이터

                        //step1(중복 아닌것 찾기)
                        jsonObj.forEach((dd) => {   //파일 데이터
                            const overwrapData = merged.filter(m => m.id === dd.id);
                            if(overwrapData.length){    //중복
                                
                                let tmpChkedArr = [];
                                if(overwrapData[0].dailyChked && overwrapData[0].dailyChked.length){
                                    tmpChkedArr = [...overwrapData[0].dailyChked];
                                }

                                toUpdateData.push({
                                    id: dd.id,
                                    dailyChked: [...new Set([...dd.dailyChked, ...tmpChkedArr])],
                                    memo: setMemo(overwrapData[0].memo, dd.memo)
                                });

                            }else{
                                merged.push(dd);
                            }
                        })

                        toUpdateData.forEach((tud) => {
                            merged = merged.map(mg => mg.id === tud.id ? {...mg, dailyChked: tud.dailyChked, memo: tud.memo} : mg)
                        })

                        indexeddb.query('m', merged, {
                            success: () => {
                                alert('모든 데이터를 불러왔습니다.');
                                window.location.reload();
                            }
                        });
                    }
                });

                // console.log(jsonTxt, jsonObj);
            }catch(err){
                console.error('JSON parsing 오류!');
            }finally {
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

    // const cf = confirm('해당 데이터를 덮어쓰시겠습니까?\n기존 데이터는 삭제됩니다.');
    // if(cf) indexeddb.query('o');
})

document.getElementById('clearDataBtn').addEventListener('click', () => {
    const cf = confirm('모든 데이터를 삭제하시겠습니까?');
    
    if(cf) clearData();
});
document.getElementById('downloadBtn').addEventListener('click', () => {
    const cf = confirm('어플(android)을 다운 받으시겠습니까?\nWi-Fi에 연결되지 않은 경우, 데이터 요금이 발생할 수 있습니다.');
    if(!cf) return;
    
    const randomInt = getRandomInt(1, 10);
    const prmt = prompt(`비밀번호를 입력해주세요.\nHint: ${randomInt}`);
    if(randomInt + 1 !== +prmt) return;

    const a = document.createElement('a');
    a.href = '/assets/download/매일성경-debug.apk.zip';
    a.style.display = 'none';
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
});

// document.getElementById('chkAllDataBtn').addEventListener('click', (e) => {
//     const thisYear = e.currentTarget.dataset.year;
//     const thisMonth = e.currentTarget.dataset.month;

//     const cf = confirm(`${thisYear}년 ${thisMonth}월의 모든데이터를 체크하시겠습니까?`);

//     if(cf){

//     }
// })

function setMemo(oldMemo, newMemo){
    if(oldMemo && newMemo){
        return `[기존동행]\n${oldMemo}\n\n\n[새동행]\n${newMemo}`;
    }else{
        return newMemo || oldMemo;
    }
}

function clearData(){
    indexeddb.query('i', undefined, {
        success: () => {
            alert('모든 데이터가 삭제되었습니다.');
            window.location.reload();
        }
    });
}


function parseBible2Data(data){
    const rtnArr = [];
    let tmpBibleName = '';
    let bibleId = 0;
    let bibleIdx = 0;

    for(let key in data){
        bibleIdx = isNaN(key[1]) ? 2 : 1;
        if(tmpBibleName !== key.slice(0, bibleIdx)){
            tmpBibleName = key.slice(0, bibleIdx);
            bibleId++;
        }
        const jj = key.slice(bibleIdx).split(':'); //장절
        rtnArr.push({
            BibleID: bibleId,
            ChapterNo: +(jj[0]),
            VerseNo: +(jj[1]),
            BibleScript: data[key]
        });
    }

    return rtnArr;
}