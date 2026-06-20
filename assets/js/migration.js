//version이 1이 최초(즉 2부터 업데이트 구간)
const dbVersionHistory = [
    {
        title: 'version2',
        targetTable: 'MyDailyBible',
        description: '가이드 확장으로 인해 가이드 컬럼추가(기존 데이터는 mccheyne로 변경)',
        updateDate: 20260516,
        fnc: (cursor) => {
            if (!cursor.value.guideId) {
                cursor.update({ ...cursor.value, guideId: 'mccheyne' });
            }
        }
    },
    {
        title: 'version3',
        targetTable: 'BibleVerses',
        description: '형광펜 및 구절 메모용 BibleHighlights 테이블 추가',
        updateDate: 20260620,
        fnc: (cursor) => { }
    },
]

function commonMigration(event, targetTable, fnc) {
    const store = event.target.transaction.objectStore(targetTable);
    store.openCursor().onsuccess = function (e) {
        const cursor = e.target.result;
        if (cursor) {
            fnc(cursor);
            cursor.continue();
        }
    }
}
function migrate(event, param) {
    dbVersionHistory.slice(event.oldVersion - 1).forEach(v => {
        const targetTable = v.targetTable || param.tableNm;
        commonMigration(event, targetTable, v.fnc);
    })
}