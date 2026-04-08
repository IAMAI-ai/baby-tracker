import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, serverTimestamp, query, orderBy, 
    limit, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCckGV4SJzHjUW2xMKrvtdv6PRb3js-0h8",
  authDomain: "baby-tracker-5464f.firebaseapp.com",
  projectId: "baby-tracker-5464f",
  storageBucket: "baby-tracker-5464f.firebasestorage.app",
  messagingSenderId: "42442664907",
  appId: "1:42442664907:web:0297aa44d34bfb5637e44e",
  measurementId: "G-0RX7DMW4XY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// 保存
export async function saveRecord(type, familyId) {
    try {
        await addDoc(collection(db, "baby_logs"), {
            type: type,
            familyId: String(familyId),
            timestamp: serverTimestamp()
        });
    } catch (e) { console.error(e); }
}

// 监听数据（不需要定时器，Firebase会自动推送）
export function listenToLogs(familyId, callback) {
    const q = query(
        collection(db, "baby_logs"), 
        where("familyId", "==", String(familyId)), 
        orderBy("timestamp", "desc"), 
        limit(30) 
    );
    return onSnapshot(q, (snapshot) => {
        const logs = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate() : new Date();
            const timeStr = `${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
            const fullTime = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}T${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
            logs.push({ id: doc.id, ...data, timeStr, fullTime });
        });
        callback(logs);
    });
}

// 修改时间
export async function updateRecord(id, newTimeStr) {
    if (!newTimeStr) return;
    try {
        const newDate = new Date(newTimeStr);
        await updateDoc(doc(db, "baby_logs", id), { timestamp: newDate });
    } catch (e) { console.error("更新时间失败:", e); }
}

// 修改内容
export async function updateTypeOnly(id, newType) {
    try {
        await updateDoc(doc(db, "baby_logs", id), { type: newType });
    } catch (e) { console.error("更新内容失败:", e); }
}

// 删除
export async function deleteRecord(id) {
    if(confirm("确定要删除这条记录吗？")) {
        try {
            await deleteDoc(doc(db, "baby_logs", id));
        } catch (e) { console.error("删除失败:", e); }
    }
}

export async function clearAllRecords(familyId) {
    if(confirm("确定清空全部记录吗？")) {
        const q = query(collection(db, "baby_logs"), where("familyId", "==", String(familyId)));
        const snap = await getDocs(q);
        const del = snap.docs.map(d => deleteDoc(doc(db, "baby_logs", d.id)));
        await Promise.all(del);
    }
}

// 挂载到全局
window.saveRecord = saveRecord;
window.listenToLogs = listenToLogs;
window.updateRecord = updateRecord;
window.updateTypeOnly = updateTypeOnly;
window.deleteRecord = deleteRecord;
window.clearAllRecords = clearAllRecords;
