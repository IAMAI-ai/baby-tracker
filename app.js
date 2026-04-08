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

// 保存新记录
export async function saveRecord(type, familyId) {
    try {
        await addDoc(collection(db, "baby_logs"), {
            type: type,
            familyId: String(familyId),
            timestamp: serverTimestamp()
        });
        return true;
    } catch (e) { return false; }
}

// 实时监听与格式化
export function listenToLogs(familyId, callback) {
    const q = query(
        collection(db, "baby_logs"), 
        where("familyId", "==", String(familyId)), 
        orderBy("timestamp", "desc"), 
        limit(50) 
    );
    return onSnapshot(q, (snapshot) => {
        const logs = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate() : new Date();
            const timeStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
            const fullTime = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}T${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
            logs.push({ id: doc.id, ...data, timeStr, fullTime, _dateObj: date });
        });
        logs.sort((a, b) => b._dateObj - a._dateObj);
        callback(logs);
    });
}

// 修改时间（确保 onchange 触发，解决闪退）
export async function updateRecord(id, newTimeStr) {
    if (!newTimeStr) return;
    try {
        const newDate = new Date(newTimeStr);
        await updateDoc(doc(db, "baby_logs", id), { timestamp: newDate });
        return true;
    } catch (e) { return false; }
}

// 【关键】修改文字内容（吃奶顺序/时长）
export async function updateTypeOnly(id, newType) {
    try {
        await updateDoc(doc(db, "baby_logs", id), { type: newType });
        return true;
    } catch (e) { return false; }
}

export async function deleteRecord(id) {
    if(confirm("确定删除？")) await deleteDoc(doc(db, "baby_logs", id));
}

export async function clearAllRecords(familyId) {
    if(confirm("确定清空全部记录吗？")) {
        const q = query(collection(db, "baby_logs"), where("familyId", "==", String(familyId)));
        const snap = await getDocs(q);
        const del = snap.docs.map(d => deleteDoc(doc(db, "baby_logs", d.id)));
        await Promise.all(del);
    }
}

export async function uploadAvatar(file, familyId) {
    try {
        const storageRef = ref(storage, `baby_info/${familyId}_avatar.jpg`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        localStorage.setItem(`avatar_${familyId}`, url);
        return url;
    } catch (e) { return null; }
}

window.saveRecord = saveRecord;
window.listenToLogs = listenToLogs;
window.updateRecord = updateRecord;
window.updateTypeOnly = updateTypeOnly;
window.deleteRecord = deleteRecord;
window.clearAllRecords = clearAllRecords;
window.uploadAvatar = uploadAvatar;
