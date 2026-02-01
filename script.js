import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCvwQgyakS9eh9R0TYRODmc5EXJAoCbtAc",
    authDomain: "readytravel-f4e1c.firebaseapp.com",
    databaseURL: "https://readytravel-f4e1c-default-rtdb.firebaseio.com",
    projectId: "readytravel-f4e1c",
    storageBucket: "readytravel-f4e1c.firebasestorage.app",
    messagingSenderId: "772163379284",
    appId: "1:772163379284:web:ad9285538cf9d61c8f8dc1",
    measurementId: "G-7WBH433JKG"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let currentUser = '강민성';
let currentTravel = '첫여행';
let categories = [];
let travels = [];
let selectedVersionToLoad = '';
let currentUnsubscribe = null;
let isLocked = true; // 기본 상태: 잠금

const statusToggle = { 'X': 'O', 'O': 'X' };

onValue(ref(database, 'travelNames'), (snapshot) => {
    const data = snapshot.val();
    const select = document.getElementById('travelSelect');
    if (data) travels = Object.keys(data);
    else { travels = ['첫여행']; set(ref(database, 'travelNames/첫여행'), true); }

    const currentVal = select.value || currentTravel;
    select.innerHTML = travels.map(t => `<option value="${t}">${t}</option>`).join('');
    if (travels.includes(currentVal)) select.value = currentVal;
    else select.value = travels[0];
    currentTravel = select.value;
});

window.toggleLock = () => {
    isLocked = !isLocked;
    const lockBtn = document.getElementById('lockBtn');
    if (isLocked) {
        lockBtn.innerText = '순서잠금 🔒';
        lockBtn.classList.remove('unlocked');
        document.body.classList.remove('is-unlocked');
    } else {
        lockBtn.innerText = '순서이동 🔓';
        lockBtn.classList.add('unlocked');
        document.body.classList.add('is-unlocked');
    }
};

window.switchUser = (user) => {
    currentUser = user;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === user);
    });
    loadData();
};

window.addNewTravel = () => {
    const name = prompt("새로운 여행 이름을 입력하세요:");
    if (name) set(ref(database, `travelNames/${name}`), true);
};

window.saveCurrentList = () => {
    const versionName = prompt("저장할 버전 이름을 입력하세요:");
    if (!versionName) return;
    get(ref(database, `travels/${currentTravel}/${currentUser}/current`)).then((snap) => {
        if (snap.exists()) {
            set(ref(database, `travels/${currentTravel}/${currentUser}/savedLists/${versionName}`), snap.val())
                .then(() => alert(`'${versionName}' 저장 완료!`));
        } else alert("저장할 내용이 없습니다.");
    });
};

window.resetCurrentList = () => {
    if (confirm("현재 실시간 체크리스트를 모두 비우시겠습니까?")) {
        remove(ref(database, `travels/${currentTravel}/${currentUser}/current`));
    }
};

window.openCategoryModal = () => {
    const list = document.getElementById('currentCategoryList');
    list.innerHTML = categories.map(c => `<span class="cat-tag">${c}</span>`).join('');
    document.getElementById('categoryModal').style.display = 'flex';
};

window.saveCategory = () => {
    const name = document.getElementById('newCategoryName').value.trim();
    if (!name) return;
    set(ref(database, `travels/${currentTravel}/${currentUser}/current/${name}/_isCategory`), { index: categories.length })
        .then(() => {
            document.getElementById('newCategoryName').value = '';
            closeModal('categoryModal');
        });
};

window.addItem = () => {
    refreshSelectMenus();
    document.getElementById('itemModal').style.display = 'flex';
};

window.saveItem = () => {
    const cat = document.getElementById('categorySelect').value;
    const name = document.getElementById('newItemName').value.trim();
    if (!name) return;
    get(ref(database, `travels/${currentTravel}/${currentUser}/current/${cat}`)).then(snap => {
        const idx = snap.exists() ? Object.keys(snap.val()).length : 0;
        set(ref(database, `travels/${currentTravel}/${currentUser}/current/${cat}/${name}`), { out: 'X', in: 'X', index: idx })
            .then(() => {
                document.getElementById('newItemName').value = '';
                closeModal('itemModal');
            });
    });
};

window.openLoadModal = () => {
    onValue(ref(database, `travels/${currentTravel}/${currentUser}/savedLists`), (snap) => {
        const display = document.getElementById('savedVersionsDisplay');
        if (snap.exists()) {
            display.innerHTML = Object.keys(snap.val()).map(v => 
                `<li id="ver-${v}" onclick="setVersionToLoad('${v}')">
                    <span>📄 ${v}</span>
                    <button class="mini-del-btn" onclick="deleteVersion(event, '${v}')">X</button>
                </li>`).join('');
        } else display.innerHTML = '<li>저장된 버전 없음</li>';
    });
    refreshSelectMenus();
    document.getElementById('loadModal').style.display = 'flex';
};

window.setVersionToLoad = (name) => {
    selectedVersionToLoad = name;
    document.querySelectorAll('#savedVersionsDisplay li').forEach(li => li.classList.toggle('selected', li.id === `ver-${name}`));
};

window.deleteVersion = (event, name) => {
    event.stopPropagation();
    if (confirm(`'${name}' 버전을 삭제하시겠습니까?`)) {
        remove(ref(database, `travels/${currentTravel}/${currentUser}/savedLists/${name}`))
            .then(() => {
                if (selectedVersionToLoad === name) selectedVersionToLoad = '';
            });
    }
};

window.confirmLoadVersion = () => {
    if (!selectedVersionToLoad) return alert("불러올 버전을 선택하세요.");
    get(ref(database, `travels/${currentTravel}/${currentUser}/savedLists/${selectedVersionToLoad}`)).then(snap => {
        set(ref(database, `travels/${currentTravel}/${currentUser}/current`), snap.val());
        closeModal('loadModal');
    });
};

window.uploadBulkCategories = () => {
    const text = document.getElementById('bulkCategoryText').value;
    if (!text.trim()) return;
    const cats = text.split('\n').map(c => c.trim()).filter(c => c !== "");
    const updates = {};
    cats.forEach((c, idx) => { updates[`travels/${currentTravel}/${currentUser}/current/${c}/_isCategory`] = { index: categories.length + idx }; });
    update(ref(database), updates).then(() => {
        document.getElementById('bulkCategoryText').value = '';
        alert("카테고리 일괄 생성 완료!");
    });
};

window.uploadBulkItems = () => {
    const cat = document.getElementById('bulkItemCategorySelect').value;
    const text = document.getElementById('bulkItemText').value;
    if (!text.trim()) return;
    const items = text.split('\n').map(i => i.trim()).filter(i => i !== "");
    const updates = {};
    items.forEach((item, idx) => { updates[`travels/${currentTravel}/${currentUser}/current/${cat}/${item}`] = { out: 'X', in: 'X', index: idx }; });
    update(ref(database), updates).then(() => {
        document.getElementById('bulkItemText').value = '';
        alert("아이템 일괄 생성 완료!");
    });
};

window.updateStatus = (cat, item, field, val) => {
    set(ref(database, `travels/${currentTravel}/${currentUser}/current/${cat}/${item}/${field}`), statusToggle[val]);
};

window.confirmDelete = (cat, item = null) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const path = item ? `current/${cat}/${item}` : `current/${cat}`;
    remove(ref(database, `travels/${currentTravel}/${currentUser}/${path}`));
};

window.closeModal = (id) => { document.getElementById(id).style.display = 'none'; };

function refreshSelectMenus() {
    const options = categories.map(c => `<option value="${c}">${c}</option>`).join('') + `<option value="미분류">없음</option>`;
    const catSelect = document.getElementById('categorySelect');
    const bulkSelect = document.getElementById('bulkItemCategorySelect');
    if (catSelect) catSelect.innerHTML = options;
    if (bulkSelect) bulkSelect.innerHTML = options;
}

window.loadData = () => {
    const select = document.getElementById('travelSelect');
    if (select && select.value) currentTravel = select.value;
    if (currentUnsubscribe) currentUnsubscribe();
    currentUnsubscribe = onValue(ref(database, `travels/${currentTravel}/${currentUser}/current`), (snapshot) => {
        const data = snapshot.val();
        const tbody = document.getElementById('checklistBody');
        tbody.innerHTML = ''; categories = [];
        if (!data) { refreshSelectMenus(); return; }

        const sortedCats = Object.keys(data)
            .filter(cat => data[cat]._isCategory)
            .sort((a, b) => (data[a]._isCategory.index || 0) - (data[b]._isCategory.index || 0));

        sortedCats.forEach((cat, cIdx) => {
            categories.push(cat);
            tbody.innerHTML += `<tr class="category-row" draggable="true" data-type="category" data-id="${cat}">
                <td colspan="3"><div class="name-cell"><span class="row-num">${cIdx+1}.</span><span class="name-text">${cat}</span>
                <button class="mini-del-btn" onclick="confirmDelete('${cat}')">X</button></div></td></tr>`;
            
            const sortedItems = Object.keys(data[cat])
                .filter(k => k !== '_isCategory')
                .sort((a, b) => (data[cat][a].index || 0) - (data[cat][b].index || 0));

            sortedItems.forEach((item, iIdx) => {
                const vals = data[cat][item];
                tbody.innerHTML += `<tr draggable="true" data-type="item" data-category="${cat}" data-id="${item}">
                    <td><div class="name-cell"><span class="row-num">${iIdx+1})</span><span class="name-text">${item}</span>
                    <button class="mini-del-btn" onclick="confirmDelete('${cat}', '${item}')">X</button></div></td>
                    <td class="status-col"><button class="status-btn status-${vals.out || 'X'}" onclick="updateStatus('${cat}', '${item}', 'out', '${vals.out || 'X'}')">${vals.out || 'X'}</button></td>
                    <td class="status-col"><button class="status-btn status-${vals.in || 'X'}" onclick="updateStatus('${cat}', '${item}', 'in', '${vals.in || 'X'}')">${vals.in || 'X'}</button></td></tr>`;
            });
        });
        refreshSelectMenus();
        addDragEvents();
    });
};

async function syncOrderToDB() {
    if (isLocked) return;
    const updates = {};
    let catIdx = 0, itemIdx = 0, currentCat = '';
    document.querySelectorAll('#checklistBody tr').forEach(row => {
        if (row.dataset.type === 'category') {
            currentCat = row.dataset.id;
            updates[`travels/${currentTravel}/${currentUser}/current/${currentCat}/_isCategory/index`] = catIdx++;
            itemIdx = 0;
        } else {
            updates[`travels/${currentTravel}/${currentUser}/current/${currentCat}/${row.dataset.id}/index`] = itemIdx++;
        }
    });
    await update(ref(database), updates);
}

function addDragEvents() {
    const rows = document.querySelectorAll('#checklistBody tr');
    let draggedRows = [];

    const onDragStart = (target) => {
        if (isLocked) return; // 잠금 상태면 드래그 시작 금지
        target.classList.add('dragging');
        if (target.dataset.type === 'category') {
            draggedRows = [target, ...document.querySelectorAll(`tr[data-type=\"item\"][data-category=\"${target.dataset.id}\"]`)];
        } else {
            draggedRows = [target];
        }
        draggedRows.forEach(r => r.classList.add('dragging'));
    };

    const onDragEnd = async () => {
        if (isLocked || draggedRows.length === 0) return;
        draggedRows.forEach(r => r.classList.remove('dragging'));
        draggedRows = [];
        await syncOrderToDB();
    };

    const onDragMove = (y, target) => {
        if (isLocked || !target || draggedRows.includes(target)) return;
        const bounding = target.getBoundingClientRect();
        const offset = y - bounding.top;

        if (draggedRows[0].dataset.type === 'category' && target.dataset.type === 'category') {
            const targetItems = document.querySelectorAll(`tr[data-type=\"item\"][data-category=\"${target.dataset.id}\"]`);
            const last = targetItems.length > 0 ? targetItems[targetItems.length - 1] : target;
            offset > bounding.height / 2 ? last.after(...draggedRows) : target.before(...draggedRows);
        } else if (draggedRows[0].dataset.type === 'item' && target.dataset.type === 'item' && target.dataset.category === draggedRows[0].dataset.category) {
            offset > bounding.height / 2 ? target.after(draggedRows[0]) : target.before(draggedRows[0]);
        }
    };

    rows.forEach(row => {
        row.ondragstart = () => onDragStart(row);
        row.ondragend = onDragEnd;
        row.ondragover = (e) => {
            e.preventDefault();
            onDragMove(e.clientY, e.target.closest('tr'));
        };

        // 모바일 터치 이벤트 핸들러 강화
        row.addEventListener('touchstart', (e) => {
            if (isLocked) return; // 잠금 시 무시
            if (e.target.closest('button') || e.target.closest('select') || e.target.closest('textarea')) return;
            onDragStart(row);
        }, { passive: false });

        row.addEventListener('touchmove', (e) => {
            if (isLocked || draggedRows.length === 0) return;
            e.preventDefault(); // 드래그 중 스크롤 방지
            const touchY = e.touches[0].clientY;
            const target = document.elementFromPoint(e.touches[0].clientX, touchY)?.closest('tr');
            onDragMove(touchY, target);
        }, { passive: false });

        row.addEventListener('touchend', onDragEnd);
    });
}

window.loadData();