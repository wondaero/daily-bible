function IndexedDB(param) {
    let db;

    const queryObj = {
        c: function ({ responseContext, opt, store }) {
            //insert(u로 대체한듯...)
        },
        r: function ({ responseContext, opt, store }) {
            const value = responseContext.data;
            if (opt && opt.all === true) {
                const allData = [];
                const cmdRequest = store.openCursor();

                cmdRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        allData.push(cursor.value); // 필요한 데이터 수집
                        cursor.continue(); // 다음으로 이동
                    } else {
                        responseContext.data = allData;
                    }
                };

                return;
            }
            if (value !== undefined && value !== null) {  //단순 조회
                const cmdRequest = store.get(value);

                cmdRequest.onsuccess = function () {
                    responseContext.data = cmdRequest.result;
                };
                return;
            }
            if (value === undefined && opt && opt.where) {  //where조건 느낌
                const filteredData = [];
                const cmdRequest = store.openCursor();
                cmdRequest.onsuccess = function (event) {
                    const cursor = event.target.result;
                    if (cursor) {
                        const data = cursor.value;
                        if (opt.where(data)) {  // 조건에 확인
                            filteredData.push(data);
                        }
                        cursor.continue(); // 다음 데이터로 이동
                    } else {    //모든 데이터를 순회하면
                        responseContext.data = filteredData;
                    }
                };

                return;
            }
            if (value === undefined && opt && opt.like) {
                const filteredData = [];
                const prefix = opt.like;

                const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
                const cmdRequest = store.openCursor(range);

                cmdRequest.onsuccess = function (event) {
                    const cursor = event.target.result;
                    if (cursor) {
                        filteredData.push(cursor.value);
                        cursor.continue(); // 다음 데이터로 이동
                    } else {    //모든 데이터를 순회하면
                        responseContext.data = filteredData;
                    }
                };

                return;
            }
        },
        u: function ({ responseContext, opt, store }) {
            const value = responseContext.data;

            if (!value || !value[param.key]) return;

            let data;

            const cmdRequest = store.get(value[param.key]);

            cmdRequest.onsuccess = function () {
                data = cmdRequest.result;
                const isUpsert = opt && opt.upsert === true;

                if (!data && !isUpsert) {
                    console.log(`ID ${value[param.key]} 데이터가 없고, 등록(upsert) 옵션도 꺼져 있어 저장하지 않습니다.`);
                    return;
                }

                const updatedRecord = { ...data, ...value };
                store.put(updatedRecord);

                responseContext.data = value[param.key];
            };

        },
        d: function ({ responseContext, store }) {
            const value = responseContext.data;

            if (value === undefined || value === null) return;

            store.delete(value);
        },
        i: function ({ store }) {
            store.clear();  // 이게 전체 데이터 삭제
        },
        m: function ({ responseContext, opt, store }) {
            const value = responseContext.data;

            if (!value || !value.length) return;

            if (opt && opt.overwrite === true) {
                value.forEach(item => {
                    store.put(item);
                });
                return; // 👈 작업 예약 완료 후 즉시 탈출
            }

            //기본값이 true
            const isUpsert = opt && opt.upsert === false ? false : true;

            value.forEach(item => {
                const getRequest = store.get(item[param.key]);

                getRequest.onsuccess = () => {
                    const data = getRequest.result;

                    if (!data && !isUpsert) {
                        console.log(`ID ${item[param.key]} 데이터가 없고, 등록(upsert) 옵션도 꺼져 있어 저장하지 않습니다.`);
                        return;
                    }

                    const updateRecord = { ...data, ...item };
                    store.put(updateRecord);
                }
            })
        },
    };

    (function constructor() {
        // IndexedDB 연결 열기
        const openDB = indexedDB.open(param.dbNm, param.dbVersion);

        // 데이터베이스가 처음 생성될 때 호출 (스키마 설정)
        openDB.onupgradeneeded = function (event) {
            const tempDB = event.target.result;

            //테이블 추가시 여기에 조건 추가 할것(나중에 자동화할 예정)
            // Object Store 생성
            if (!tempDB.objectStoreNames.contains('MyDailyBible')) {
                tempDB.createObjectStore('MyDailyBible', { keyPath: param.key }); // id를 키로 사용
            }
            if (!tempDB.objectStoreNames.contains('BibleVerses')) {
                tempDB.createObjectStore('BibleVerses', { keyPath: param.key }); // id를 키로 사용
            }
            //indexedDB 업데이트 사항들 적용
            migrate(event, param);

        };

        openDB.onsuccess = function (event) {
            db = event.target.result;  // ← 여기서 바깥 let db에 저장
        };
        openDB.onerror = function (event) {
            console.error('DB 연결 실패', event.target.error);
        };
    })();

    this.query = (cmd, value, opt) => {
        if (!db) return;

        const cmds = 'crud-mi'; //- 하이픈은 안씀, b는 backup, o는 overwrite, m은 multiUpdate, i는 initData

        if (cmd.length !== 1 || cmd === '-' || cmds.indexOf(cmd) < 0) return;

        const isRead = cmd === 'r';
        const transaction = db.transaction(param.tableNm, isRead ? 'readonly' : 'readwrite');
        const store = transaction.objectStore(param.tableNm);

        const responseContext = { data: value };


        transaction.oncomplete = () => {
            if (opt && typeof opt.success === 'function') opt.success(responseContext.data);
        }

        transaction.onerror = e => {
            console.error(`${cmd} 작업 중 트랜잭션 에러 발생: `, e.target.error);
            if (opt && typeof opt.error === 'function') {
                opt.error(e.target.error);
            }
        }

        if (typeof queryObj[cmd] === 'function') queryObj[cmd]({ responseContext, opt, store });

    }

}