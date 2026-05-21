//version이 1이 최초(즉 2부터 업데이트 구간)
const dbVersionHistory = [
    {
        title: 'version2',
        description: '가이드 확장으로 인해 가이드 컬럼추가(기존 데이터는 mccheyne로 변경)',
        updateDate: 20260516,
        fnc: (cursor) => {
            if (!cursor.value.guideId) {
                cursor.update({ ...cursor.value, guideId: 'mccheyne' });
            }
        }
    },
]

function commonMigration(event, param, fnc){
    const store = event.target.transaction.objectStore(param.tableNm);
    store.openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor){
            fnc(cursor);
            cursor.continue();
        }
    }
}
function migrate(event, param){
    dbVersionHistory.slice(event.oldVersion - 1).forEach(v => {
        commonMigration(event, param, v.fnc);
    })
}