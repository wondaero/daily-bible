let dailyData;
let bible;

const valueObj = {
    m_e: 'm',
    d_e: 'd',
    r_e: 'where',
    m_k: '월',
    d_k: '일',
    r_k: '어디',
}

const localData = {};

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
    '요한복음','사도행전', '로마서',
    '고린도전서', '고린도후서', '갈라디아서','에베소서',
    '빌립보서', '골로새서', '데살로니가전서', '데살로니가후서',
    '디모데전서', '디모데후서', '디도서', '빌레몬서',
    '히브리서', '야고보서', '베드로전서', '베드로후서',
    '요한일서', '요한이서', '요한삼서', '유다서', '요한계시록'
];

document.getElementById('yearInput').addEventListener('click', (e) => {
   document.getElementById('dimLayer').classList.add('active');
   document.getElementById('datePopup').classList.add('active');
   document.getElementById('biblePopup').classList.remove('active');

   const yearList = document.getElementById('yearList');

   yearList.innerHTML = '';
   //2024를 기준으로 하자
   for(let i = 0; i < 101; i++){
    const li = document.createElement('li');
    li.textContent = 2024 - 50 + i;

    li.addEventListener('click', e => {
        const lis2 = document.querySelectorAll('#yearList li');
        const targetLi = e.currentTarget;

        let currIdx;

        lis2.forEach((li2, idx) => {
            li2.classList.remove('active');

            if(targetLi.textContent === li2.textContent) currIdx = idx;
        });

        targetLi.closest('ul').scrollTop = (currIdx - 1) * 30;
        targetLi.classList.add('active');
    })

    yearList.appendChild(li);
   }

   yearList.scrollTop = 30 * 49;
})

document.getElementById('yearList').addEventListener('scroll', e => {
    const currScroll = e.currentTarget.scrollTop;
    const lis = e.currentTarget.querySelectorAll('li');
    const mnYear = lis[0].textContent;
    const mxYear = lis[lis.length - 1].textContent;
    const yearCnt = 50;

    if(currScroll < 1){
        for(let i = 0; i < yearCnt; i++){
            const li = document.createElement('li');
            const thisYear = mnYear - 1 - i;
            if(thisYear < 0) break;

            li.textContent = thisYear;

            li.addEventListener('click', e => {
                const lis2 = document.querySelectorAll('#yearList li');
                const targetLi = e.currentTarget;

                let currIdx;

                lis2.forEach((li2, idx) => {
                    li2.classList.remove('active');

                    if(targetLi.textContent === li2.textContent) currIdx = idx;
                });

                targetLi.closest('ul').scrollTop = (currIdx - 1) * 30;
                targetLi.classList.add('active');
            })

            yearList.prepend(li);
            yearList.scrollTop = 30 * yearCnt;
        }

    }else if(currScroll + e.currentTarget.clientHeight + 1 > e.currentTarget.scrollHeight){

        for(let i = 0; i < yearCnt; i++){
            const li = document.createElement('li');
            const thisYear = +mxYear + 1 + i;

            li.textContent = thisYear;

            li.addEventListener('click', e => {
                const lis2 = document.querySelectorAll('#yearList li');
                const targetLi = e.currentTarget;

                let currIdx;

                lis2.forEach((li2, idx) => {
                    li2.classList.remove('active');

                    if(targetLi.textContent === li2.textContent) currIdx = idx;
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

            if(targetLi.textContent === li2.textContent) currIdx = idx;
        });

        targetLi.closest('ul').scrollTop = (currIdx - 1) * 30;
        targetLi.classList.add('active');
    })

})

document.getElementById('closeDatePopupBtn').addEventListener('click', () => {
    document.getElementById('dimLayer').classList.remove('active');
    document.getElementById('datePopup').classList.remove('active');
    document.getElementById('biblePopup').classList.remove('active');
})

document.getElementById('applyDateBtn').addEventListener('click', () => {
    const yearList = document.getElementById('yearList');
    const monthList = document.getElementById('monthList');

    const selectedYear = yearList.querySelector('li.active');
    const selectedMonth = monthList.querySelector('li.active');

    if(!selectedYear){
        alert('year을 선택해주세요.');
        return;
    }
    if(!selectedMonth){
        alert('month를 선택해주세요.');
        return;
    }

    document.getElementById('dimLayer').classList.remove('active');
    document.getElementById('datePopup').classList.remove('active');
    
    getCalendar('#calendar', {y: selectedYear.textContent, m: selectedMonth.textContent, d: 1});
})

document.getElementById('prevMonthBtn').addEventListener('click', () => {
    const yearInput = document.getElementById('yearInput');
    const thisYear = yearInput.querySelector('span').textContent;
    const thisMonth = yearInput.querySelector('strong').textContent;

    const thisDate = new Date(+thisYear, (+thisMonth - 1), 1);
    getCalendar('#calendar', {y: thisDate.getFullYear(), m: (+thisMonth - 1), d: 1});
})
document.getElementById('nextMonthBtn').addEventListener('click', () => {
    const yearInput = document.getElementById('yearInput');
    const thisYear = yearInput.querySelector('span').textContent;
    const thisMonth = yearInput.querySelector('strong').textContent;
    const thisDate = new Date(+thisYear, (+thisMonth - 1), 1);

    getCalendar('#calendar', {y: thisDate.getFullYear(), m: (+thisMonth + 1), d: 1});
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
    }
}

function dateFormat(d){
    return {
        y: d.getFullYear(),
        m: d.getMonth() + 1,
        d: d.getDate(),
    };
}

function parseBook(txt){
    const bookArr1 = txt.split('/');
    const bookArr2 = [];
    let finalTxt = '';

    bookArr1.forEach(el => {
        finalTxt = '';
        const book = el.split('b');
        finalTxt += bookName[+book[0] - 1] + ' ';

        if(book[1].indexOf('-') > -1){  //어디부터 어디까지
            finalTxt += book[1].split('-')[0] + ' - ' + book[1].split('-')[1] + '장';
        }else{
            if(book[1].indexOf(':') > -1){
                finalTxt += book[1].split(':')[0] + '장';
                if(book[1].indexOf('~') > -1){
                    const verses = book[1].split('~');
                    finalTxt += ' ' + verses[0].split(':')[1] + ' ~ ' + verses[1] + '절';
                }
            }else{
                finalTxt += book[1] + '장';
            }
        }
        bookArr2.push(finalTxt);
    })

    return bookArr2;
}

function getCalendar(target, setDate){
    const calendarTarget = typeof target == 'object' ? target : document.querySelector(target);

    //ui초기화
    calendarTarget.innerHTML = '';
    
    const colWidth = 100 / 7;
    const dateKr = ['일', '월', '화', '수', '목', '금', '토'];
    const date = setDate ? new Date(setDate.y, setDate.m - 1, setDate.d) : new Date();
    const randomTxt = getRandomTxt('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' , 10);
    const thisMonth = date.getMonth() + 1;
    const nowD = date.getDate();	//index아님
    const tmpDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const lastDay = tmpDate.getDate();	//마지막일

    tmpDate.setDate(1);
    const dayFirst = tmpDate.getDay();	//금월 첫 요일
    const rowCnt = calcBlockCnt(dayFirst, lastDay);

    document.getElementById('yearInput').innerHTML = `
        <span>${date.getFullYear()}</span>
        <strong>${date.getMonth() + 1}<strong>
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
    const headTrTag2 = appendTag(tHeadTag, 'tr');
    const headThTag1 = appendTag(headTrTag1, 'th', {
        attr: {colspan: 7},
        style: {
            border: '1px solid #ffffff80',
            padding: '5px'
        }
    });

    const thFlexBox = appendTag(headThTag1, 'DIV', {
        style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%'
        }
    });

    const thLeftSide = appendTag(thFlexBox, 'DIV', {
        style: {
            display: 'flex',
            alignItems: 'center'
        }
    });
    const thRightSide = appendTag(thFlexBox, 'DIV');

    const monthDataList = appendTag(thLeftSide, 'DATALIST', {attr: {id: 'monthData_' + randomTxt}});

    for(let i = 0; i < 12; i++){
        appendTag(monthDataList, 'OPTION', {
            attr: {
                value: (i + 1),
                html: (i + 1)
            }
        });
    }
    const todayBtn = appendTag(thRightSide, 'BUTTON', {
        html: 'Today',
        fnc: {
            click: () => {getCalendar('#calendar');}
        }
    });

    calendarTarget.appendChild(tableTag);
    for(let i = 0; i < 7; i++){
        const week = appendTag(headTrTag2, 'TH', {
            html: dateKr[i],
            style: {
                textAlign: 'center',
                borderBottom: '1px solid rgba(0, 0, 0, .5)',
                fontWeight: 900
            }
        });

        if(i == 0) week.classList.add('sun');
        if(i == 6) week.classList.add('sat');
    }

    //아래 컨텐츠
    const tBodyTag = document.createElement('TBODY');
    tableTag.appendChild(tBodyTag);
    for(let i = 0; i < rowCnt; i++){
        // const trTag = document.createElement('TR');
        // tBodyTag.appendChild(trTag);

        const trTag = appendTag(tBodyTag, 'TR');

        for(let j = 0; j < 7; j++){
            const tdTag = appendTag(trTag, 'TD', {
                attr: {'data-block-idx': ((i * 7) + (j + 1))}
            });
        }
    }

    for(let i = 0; i < lastDay; i++){
        const blockTarget = document.querySelector('[data-block-idx="' + (i + dayFirst + 1) + '"]');
        blockTarget.addEventListener('click', e => {
            const allBlock = document.querySelectorAll('[data-block-idx]');

            allBlock.forEach(block => block.classList.remove('on'));
            blockTarget.classList.add('on');

            const thisYear = +document.getElementById('yearInput').querySelector('span').textContent;
            const thisMonth = +document.getElementById('yearInput').querySelector('strong').textContent;
            const thisDate = +e.currentTarget.dataset.date;

            const nowData = dailyData.filter(d => d[valueObj.m_k] === thisMonth && d[valueObj.d_k] === thisDate);

            console.log(parseBook(nowData[0][valueObj.r_k].split('/')[0]));

            document.getElementById('bibleList').dataset.date = `${thisYear}_${thisMonth}_${thisDate}`;

            document.getElementById('bibleList').innerHTML = '';

            nowData[0][valueObj.r_k].split('/').forEach(d => {
                const withRange1 = d.split('-');

                if(withRange1.length === 2){
                    const start = withRange1[0].split('b')[1];
                    const bibleCnt = +withRange1[1] - +start;
                    for(let i = 0; i < bibleCnt + 1; i++){
                        document.getElementById('bibleList').appendChild(bibleTemplate(withRange1[0].split('b')[0] + 'b' + (+start + i), d));
                    }
                }else{
                    document.getElementById('bibleList').appendChild(bibleTemplate(d));
                }

            });
        })
        // blockTarget.insertAdjacentHTML('afterbegin', (i + 1));
        blockTarget.innerHTML = `<div><strong>${(i + 1)}</strong><span></span></div>`;
        blockTarget.setAttribute('data-date', (i + 1));
        blockTarget.style.cssText += `color: #000;`;
    }

    for(let i = 0; i < 6; i++){	//토일 색 변경
        const redTarget = document.querySelector('[data-block-idx="' + ((i * 7) + 1) + '"]');
        const blueTarget = document.querySelector('[data-block-idx="' + ((i * 7) + 7) + '"]');

        // if(redTarget) redTarget.style.color = '#f0f';
        // if(blueTarget) blueTarget.style.color = '#0ff';


        if(redTarget && redTarget.querySelector('strong')) redTarget.querySelector('strong').classList.add('sun');
        if(blueTarget && blueTarget.querySelector('strong')) blueTarget.querySelector('strong').classList.add('sat');
    }

    if(!setDate){   //투데이
        const todayTarget = document.querySelector('[data-date="' +nowD + '"]');
        todayTarget.querySelector('strong').classList.add('today');
    }
}

function bibleTemplate(d, org){
    const li = document.createElement('li');
    li.innerHTML = `
        <div>
            <div>
                <input type="checkbox" value="${d}" data-id="chkRead" />
                <strong>${parseBook(d)}</strong>
            </div>
            <button>보기</button>
        </div>
    `;

    const outerChkBox = li.querySelector('input');

    if(org !== undefined) outerChkBox.dataset.org = org;

    outerChkBox.addEventListener('change', e => {
        const thisDate = document.getElementById('bibleList').dataset.date;

        if(e.currentTarget.checked){
            if(localData.hasOwnProperty(thisDate)) localData[thisDate].push(e.currentTarget.value);
            else localData[thisDate] = [e.currentTarget.value];
        }else{
            localData[thisDate] = localData[thisDate].filter(dd => dd !== e.currentTarget.value);
        }

        saveData();

        console.log(localData);
    })

    li.querySelector('[data-id="chkRead"]').addEventListener('change', e => {
        //todo 로컬스토리지에 저장하기
        //todo for문으로 전체 확인해서 전체 체크일 경우 전체 체크 체크
    })
    li.querySelector('button').addEventListener('click', e => {
        document.getElementById('dimLayer').classList.add('active');
        document.getElementById('biblePopup').classList.add('active');
        document.getElementById('datePopup').classList.remove('active');

        const parseData = d.split('b');

        thisBible = bible.filter(bs => +bs.BibleID === +parseData[0] && +bs.ChapterNo === +parseData[1]);

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

document.getElementById('closeBiblePopupBtn').addEventListener('click', () => {
    document.getElementById('dimLayer').classList.remove('active');
    document.getElementById('datePopup').classList.remove('active');
    document.getElementById('biblePopup').classList.remove('active');
})

function calcBlockCnt(week, date) {
    const firstRowColCnt = 7 - week;

    const remindDate = date - firstRowColCnt;
    const tmpRowCnt = parseInt(remindDate / 7);
    const remindDate2 = remindDate % 7;
    
    const finalRowCnt = 1 + tmpRowCnt + (remindDate2 ? 1 : 0);

    return finalRowCnt;
}

function getRandomTxt(data, len){
    let rtnVal = '';
    for(let i = 0; i < len; i++){
        const randomIdx = Math.floor(Math.random() * (data.length - 1));
        rtnVal += data[randomIdx];
    }

    return rtnVal;
}

function appendTag(target, tagNm, option){
    const toTarget = typeof target == 'object' ? target : document.querySelector('target');
    const tag =  document.createElement(tagNm);
    if(option && option.html) tag.insertAdjacentHTML('afterbegin', option.html);
    if(option && option.attr) for(key in option.attr) tag.setAttribute(key, option.attr[key]);
    if(option && option.class) option.class.forEach((el) => tag.classList.add(el));
    if(option && option.style) for(key in option.style) tag.style[key] = option.style[key];
    if(option && option.fnc) for(key in option.fnc) tag.addEventListener(key, option.fnc[key]);

    toTarget.appendChild(tag);

    return tag;
}

function saveData(){
    window.localStorage.setItem('dailyBible', JSON.stringify(localData));
}
function loadData(d){   //거의 한번
    const loaded = window.localStorage.getItem('dailyBible');
    localData = {...JSON.parse(loaded)};
}



getCalendar('#calendar');

// 페이지 로드 후 자동으로 엑셀 파일을 불러옴
window.onload = async function () {
    
    dailyData = await fetchAndReadExcel('./data/daily-data.xlsx');  // 페이지 로드 시 자동으로 엑셀 파일을 읽음
    bible = await fetchAndReadExcel('./data/bible-kr.xlsb');  // 페이지 로드 시 자동으로 엑셀 파일을 읽음

    const nowObj = dateFormat(new Date());

    console.log(dailyData);
    console.log(bible);
    console.log(nowObj);

    

    const todayData = dailyData.filter(d => d[valueObj.m_k] === nowObj.m && d[valueObj.d_k] === nowObj.d)[0];
    console.log(todayData);


    console.log(parseBook(todayData[valueObj.r_k]).join(', '));
};