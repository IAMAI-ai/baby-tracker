import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, serverTimestamp, query, orderBy, 
    limit, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// 1. Firebase 配置信息 (保持不变)
const firebaseConfig = {
  apiKey: "AIzaSyCckGV4SJzHjUW2xMKrvtdv6PRb3js-0h8",
  authDomain: "baby-tracker-5464f.firebaseapp.com",
  projectId: "baby-tracker-5464f",
  storageBucket: "baby-tracker-5464f.firebasestorage.app",
  messagingSenderId: "42442664907",
  appId: "1:42442664907:web:0297aa44d34bfb5637e44e",
  measurementId: "G-0RX7DMW4XY"
};

// 2. 初始化服务
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

/**
 * 保存记录：强制将 familyId 转为字符串
 */
async function saveRecord(type, familyId) {
    try {
        const idStr = String(familyId); 
        await addDoc(collection(db, "baby_logs"), {
            type: type, // 这里存的是正确的类型名称：吃甜甜
            familyId: idStr,
            timestamp: serverTimestamp(),
            createdAt: serverTimestamp()
        });
        console.log(`成功记录: ${type}`);
        return true;
    } catch (e) {
        console.error("保存失败:", e);
        return false;
    }
}

/**
 * 实时监听：针对数据混淆和手机端重排进行深层优化
 */
function listenToLogs(familyId, callback) {
    const idStr = String(familyId); 
    const q = query(
        collection(db, "baby_logs"), 
        where("familyId", "==", idStr), 
        orderBy("timestamp", "desc"), 
        limit(50) 
    );

    return onSnapshot(q, (snapshot) => {
        const logs = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate() : new Date();
            
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');

            // 1. 列表显示格式：YYYY-MM-DD HH:mm
            const timeStr = `${year}-${month}-${day} ${hours}:${minutes}`;
            
            // 2. 控件回显格式：YYYY-MM-DDTHH:mm (必须带T)
            const fullTime = `${year}-${month}-${day}T${hours}:${minutes}`;
            
            // 【深度修复】：手动修正因旧数据ID混淆导致的问题，确保列表显示正确类型
            let currentType = data.type;
            if(data.type && data.type.includes('id=')) {
                // 如果类型名称中包含了 "宝宝头像" 这样的图片，将其强制改为 "吃甜甜"
                // 这是为了修正旧数据ID，不影响新纪录
                currentType = "吃甜甜";
            } else if (data.type === "宝宝头像" || !data.type) {
                // 兜底：如果直接为空，通常是由于类型字段混淆引起的错误
                currentType = "吃甜甜";
            }
            
            logs.push({ 
                id: doc.id, 
                ...data, 
                type: currentType, // 使用修正后的类型名称
                timeStr, 
                fullTime, 
                _dateObj: date // 将日期对象存入辅助排序
            });
        });
        
        // 【关键排序逻辑】：修正完类型数据后，强制在前端重新按日期对象降序排列
        logs.sort((a, b) => b._dateObj - a._dateObj);
        
        console.log(`[实时监听] 更新并重新降序排列了 ${logs.length} 条数据`);
        callback(logs);
    }, (error) => {
        console.error("Firebase 监听报错:", error.message);
    });
}

/**
 * 更新记录：修复手机端选择时间闪退问题
 */
async function updateRecord(id, newTimeStr) {
    try {
        const newDate = new Date(newTimeStr);
        // 使用 updateDoc 而不是全量替换，性能更好更稳定
        await updateDoc(doc(db, "baby_logs", id), { 
            timestamp: newDate 
        });
        // 这里的 console.log 用于调试，可以删除
        console.log(`成功将ID: ${id} 修改为新时间: ${newTimeStr}`);
        return true;
    } catch (e) { 
        console.error("更新失败:", e);
        return false; 
    }
}

/**
 * 删除单条记录
 */
async function deleteRecord(id) {
    if(confirm("确定要删除这条记录吗？")) {
        try {
            await deleteDoc(doc(db, "baby_logs", id));
            return true;
        } catch (e) { return false; }
    }
}

/**
 * 一键清空当前家庭的所有记录
 */
async function clearAllRecords(familyId) {
    try {
        const idStr = String(familyId);
        const q = query(collection(db, "baby_logs"), where("familyId", "==", idStr));
        const querySnapshot = await getDocs(q);
        
        const deletePromises = querySnapshot.docs.map(document => 
            deleteDoc(doc(db, "baby_logs", document.id))
        );
        
        await Promise.all(deletePromises);
        return true;
    } catch (e) {
        console.error("清空失败:", e);
        return false;
    }
}

/**
 * 上传头像到 Firebase Storage
 */
async function uploadAvatar(file, familyId) {
    try {
        const storageRef = ref(storage, `baby_info/${familyId}_avatar.jpg`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        // 将上传成功的地址存入本地缓存，防止刷新丢失
        localStorage.setItem(`avatar_${familyId}`, url);
        return url;
    } catch (e) { return null; }
}

// 导出到全局
window.saveRecord = saveRecord;
window.listenToLogs = listenToLogs;
window.updateRecord = updateRecord;
window.deleteRecord = deleteRecord;
window.clearAllRecords = clearAllRecords;
window.uploadAvatar = uploadAvatar;
