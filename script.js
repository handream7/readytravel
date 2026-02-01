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
let travels = ['첫여행'];
let selectedTravelToLoad = '';
let currentUnsubscribe = null;

const statusToggle = { 'X': 'O', 'O': 'X' };

onValue(ref(database, 'travelNames'), (snapshot) => {
    const data = snapshot.val();
    const select = document.getElementById('travelSelect');
    if (data) travels = Object.keys(data);
    else travels = ['첫여행'];
    const currentVal = select.value || currentTravel;
    select.innerHTML = travels.map(t => `<option value="${t}">${t}</option>`).join('');
    if (travels.includes(currentVal)) {
        select.value = currentVal;
        currentTravel = currentVal;
    } else {
        select.value = travels[0];
        currentTravel = travels[0];
    }
});

window.switchUser = (user) => {
    currentUser = user;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === user);
    });
    loadData();
};

function refreshSelectMenus() {
    const bulkItemCatSelect = document.getElementById('bulkItemCategorySelect');
    const singleCatSelect = document.getElementById('categorySelect');
    const optionsHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('') + `<option value="미분류">없음</option>`;
    if (bulkItemCatSelect) bulkItemCatSelect.innerHTML = optionsHTML;
    if (singleCatSelect) singleCatSelect.innerHTML = optionsHTML;
}

window.addNewTravel = () => {
    const name = prompt("새 여행 이름을 입력하세요:");
    if (name) {
        set(ref(database, `travelNames/${name}`), true).then(() => {
            document.getElementById('travelSelect').value = name;
            currentTravel = name;
            loadData();
        });
    }
};

window.saveCurrentList = () => {
    const title = prompt("목록 저장 이름을 입력하세요 (백업용):");
    if (!title) return;
    get(ref(database, `travels/${currentTravel}/${currentUser}`)).then((snapshot) => {
        if (snapshot.exists()) {
            set(ref(database, `travels/${title}/${currentUser}`), snapshot.val());
            set(ref(database, `travelNames/${title}`), true).then(() => alert(`'${title}' 저장 완료!`));
        }
    });
};

window.resetCurrentList = () => {
    if (confirm("정말 현재 체크리스트를 싹 지우시겠습니까?")) {
        remove(ref(database, `travels/${currentTravel}/${currentUser}`)).then(() => alert("초기화되었습니다."));
    }
};

window.openCategoryModal = () => {
    document.getElementById('currentCategoryList').innerHTML = categories.map(c => `<span class="cat-tag">${c}</span>`).join('');
    document.getElementById('categoryModal').style.display = 'flex';
};

window.saveCategory = () => {
    const category = document.getElementById('newCategoryName').value.trim();
    if (!category || categories.includes(category)) return alert("이름을 확인하세요.");
    set(ref(database, `travels/${currentTravel}/${currentUser}/${category}/_isCategory`), true).then(() => {
        document.getElementById('newCategoryName').value = '';
        closeModal('categoryModal');
    });
};

window.addItem = () => {
    refreshSelectMenus();
    document.getElementById('itemModal').style.display = 'flex';
};

window.saveItem = () => {
    const category = document.getElementById('categorySelect').value;
    const itemName = document.getElementById('newItemName').value.trim();
    if (!itemName) return;
    set(ref(database, `travels/${currentTravel}/${currentUser}/${category}/${itemName}`), { out: 'X', in: 'X' }).then(() => {
        document.getElementById('newItemName').value = '';
        closeModal('itemModal');
    });
};

window.openLoadModal = () => {
    document.getElementById('travelListDisplay').innerHTML = travels.map(t => `<li id="list-${t}" onclick="setSelectToLoad('${t}')">✈️ ${t}</li>`).join('');
    refreshSelectMenus();
    document.getElementById('loadModal').style.display = 'flex';
};

window.setSelectToLoad = (name) => {
    selectedTravelToLoad = name;
    document.querySelectorAll('.data-list li').forEach(li => li.classList.remove('selected'));
    if (document.getElementById(`list-${name}`)) document.getElementById(`list-${name}`).classList.add('selected');
};

window.confirmLoadTravel = () => {
    if (!selectedTravelToLoad) return alert("여행을 선택하세요.");
    if (confirm(`'${selectedTravelToLoad}'의 목록을 현재 작업 중인 '${currentTravel}' 여행으로 불러오시겠습니까?`)) {
        get(ref(database, `travels/${selectedTravelToLoad}/${currentUser}`)).then((snapshot) => {
            if (snapshot.exists()) {
                set(ref(database, `travels/${currentTravel}/${currentUser}`), snapshot.val()).then(() => {
                    alert("성공적으로 데이터를 불러왔습니다.");
                    closeModal('loadModal');
                });
            } else {
                alert("불러올 데이터가 없습니다.");
            }
        });
    }
};

window.uploadBulkCategories = () => {
    const text = document.getElementById('bulkCategoryText').value;
    if (!text.trim()) return;
    const cats = text.split('\n').map(c => c.trim()).filter(c => c !== "");
    const updates = {};
    cats.forEach(c => { updates[`travels/${currentTravel}/${currentUser}/${c}/_isCategory`] = true; });
    update(ref(database), updates).then(() => {
        document.getElementById('bulkCategoryText').value = '';
        alert(`${cats.length}개 생성 완료!`);
    });
};

window.uploadBulkItems = () => {
    const category = document.getElementById('bulkItemCategorySelect').value;
    const text = document.getElementById('bulkItemText').value;
    if (!text.trim()) return;
    const items = text.split('\n').map(i => i.trim()).filter(i => i !== "");
    const updates = {};
    items.forEach(item => { updates[`travels/${currentTravel}/${currentUser}/${category}/${item}`] = { out: 'X', in: 'X' }; });
    update(ref(database), updates).then(() => {
        document.getElementById('bulkItemText').value = '';
        alert(`${items.length}개 생성 완료!`);
    });
};

window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.updateStatus = (category, item, field, currentVal) => {
    if(!statusToggle[currentVal]) return; 
    set(ref(database, `travels/${currentTravel}/${currentUser}/${category}/${item}/${field}`), statusToggle[currentVal]);
};

window.confirmDelete = (category, item = null) => {
    const msg = item ? `'${item}' 삭제할까요?` : `'${category}' 삭제할까요?`;
    if (confirm(msg)) {
        const path = item ? `travels/${currentTravel}/${currentUser}/${category}/${item}` : `travels/${currentTravel}/${currentUser}/${category}`;
        remove(ref(database, path));
    }
};

window.loadData = () => {
    const select = document.getElementById('travelSelect');
    if (select && select.value) currentTravel = select.value;
    if (currentUnsubscribe) currentUnsubscribe();
    currentUnsubscribe = onValue(ref(database, `travels/${currentTravel}/${currentUser}`), (snapshot) => {
        const data = snapshot.val();
        const tbody = document.getElementById('checklistBody');
        tbody.innerHTML = '';
        categories = [];
        if (!data) { refreshSelectMenus(); return; }
        Object.keys(data).sort().forEach((cat, cIdx) => {
            if (cat === '_isCategory') return;
            categories.push(cat);
            tbody.innerHTML += `<tr class="category-row" draggable="true" data-type="category" data-id="${cat}">
                <td colspan="3"><div class="name-cell"><span class="name-text">${cIdx + 1}. ${cat}</span>
                <button class="mini-del-btn" onclick="confirmDelete('${cat}')">X</button></div></td></tr>`;
            Object.keys(data[cat]).filter(k => k !== '_isCategory').sort().forEach((item, iIdx) => {
                const vals = data[cat][item];
                tbody.innerHTML += `<tr draggable="true" data-type="item" data-category="${cat}" data-id="${item}">
                    <td><div class="name-cell"><span class="name-text">${iIdx + 1}) ${item}</span>
                    <button class="mini-del-btn" onclick="confirmDelete('${cat}', '${item}')">X</button></div></td>
                    <td class="status-col"><button class="status-btn status-${vals.out || 'X'}" onclick="updateStatus('${cat}', '${item}', 'out', '${vals.out || 'X'}')">${vals.out || 'X'}</button></td>
                    <td class="status-col"><button class="status-btn status-${vals.in || 'X'}" onclick="updateStatus('${cat}', '${item}', 'in', '${vals.in || 'X'}')">${vals.in || 'X'}</button></td></tr>`;
            });
        });
        refreshSelectMenus();
        addDragEvents();
    });
};

function addDragEvents() {
    const tbody = document.getElementById('checklistBody');
    const rows = document.querySelectorAll('#checklistBody tr');
    let draggedRows = []; // 카테고리 뭉치를 담을 배열

    rows.forEach(row => {
        row.addEventListener('dragstart', (e) => {
            row.classList.add('dragging');
            if (row.dataset.type === 'category') {
                const catId = row.dataset.id;
                // 해당 카테고리와 그 아래 아이템들을 모두 선택
                draggedRows = [row, ...document.querySelectorAll(`tr[data-type="item"][data-category="${catId}"]`)];
                draggedRows.forEach(r => r.classList.add('dragging'));
            } else {
                draggedRows = [row];
            }
        });

        row.addEventListener('dragend', () => {
            draggedRows.forEach(r => r.classList.remove('dragging'));
            draggedRows = [];
        });

        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            const target = e.target.closest('tr');
            if (!target || draggedRows.includes(target)) return;

            // 같은 타입끼리만 이동 가능하게 하거나, 카테고리 이동 시 뭉치 전체 이동
            if (draggedRows[0].dataset.type === 'category' && target.dataset.type === 'category') {
                const bounding = target.getBoundingClientRect();
                const offset = e.clientY - bounding.top;
                
                // 타겟 카테고리의 아이템들 중 마지막 행 찾기
                const targetCatId = target.dataset.id;
                const targetItems = document.querySelectorAll(`tr[data-type="item"][data-category="${targetCatId}"]`);
                const lastItemOfTarget = targetItems.length > 0 ? targetItems[targetItems.length - 1] : target;

                if (offset > bounding.height / 2) {
                    // 타겟 카테고리 뭉치 뒤로 이동
                    lastItemOfTarget.after(...draggedRows);
                } else {
                    // 타겟 카테고리 뭉치 앞으로 이동
                    target.before(...draggedRows);
                }
            } else if (draggedRows[0].dataset.type === 'item' && target.dataset.type === 'item' && target.dataset.category === draggedRows[0].dataset.category) {
                // 같은 카테고리 내 아이템 순서 변경
                const bounding = target.getBoundingClientRect();
                const offset = e.clientY - bounding.top;
                if (offset > bounding.height / 2) target.after(draggedRows[0]);
                else target.before(draggedRows[0]);
            }
        });
    });
}

window.loadData();