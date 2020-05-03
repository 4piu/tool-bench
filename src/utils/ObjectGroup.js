const objectGroup = (objArr, keyName) => {
    const map = new Map();
    objArr.forEach((item) => {
        const key = item[keyName];
        const collection = map.get(key);
        if (!collection) {
            map.set(key, [item]);
        } else {
            collection.push(item);
        }
    });
    return map;
}

export default objectGroup;