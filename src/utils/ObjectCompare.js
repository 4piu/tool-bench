export const shallowCompare = (obj1, obj2, ignoreKeys = []) =>
    Object.keys(obj1).every(key =>
        ignoreKeys.includes(key) || obj2.hasOwnProperty(key) && obj1[key] === obj2[key]
    );

export const deepCompare = (obj1, obj2, ignoreKeys= []) => {

};