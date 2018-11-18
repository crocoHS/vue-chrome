import storage from './storage';
import allSites from './data';

// set up initial data
storage.initialize();

export const networkFilters = {
  urls: Object.values(allSites).map(each => each.url)
};

export const CONFIGKEY = 'sites';

export default {
  getData(key) {
    return storage.getData(key);
  },

  /**
   * @description check if tab is one of the sites being tracked
   * @param {string} tabUrl
   * @returns {boolean}
   */
  isTabAMatch(tabUrl) {
    return networkFilters.urls.some(each => each.includes(tabUrl));
  },

  getHostIndex(store, name) {
    return store.findIndex(each => each.name === name);
  },

  hostVisited(store, name) {
    return this.getHostIndex(store, name) >= 0;
  },

  /**
   * @description returns the current date in the format YYYY-MM-DD
   * @returns {string}
  */
  getCurrentDate() {
    return new Date().toISOString().substr(0, 10);
  },

  /**
   * @description close out all currently active sites being tracked
   * @param {Array<string>} all array of sites currently being tracked (this should
   * typically be an array of length 1)
   */
  end(cacheStorage) {
    const moment = Date.now();
    const { active } = cacheStorage;
    active.forEach((eachHost) => {
      const seconds = parseInt((moment - eachHost.timeStamp) / 1000, 10);
      const currentDate = this.getCurrentDate();
      if (!cacheStorage.data[currentDate]) {
        cacheStorage.data = {};
        cacheStorage.data[currentDate] = {};
      }
      // intentionally manipulating cache storage to keep it updated real time
      cacheStorage.data[currentDate][eachHost.name] = cacheStorage.data[currentDate][eachHost.name]
        ? cacheStorage.data[currentDate][eachHost.name] + seconds
        : seconds;
      storage.update(eachHost.name, seconds);
    });
  },

  /**
   * @description get site main name
   * @param {string} url url of the site visited
   * @returns {string} host name
   */
  getName(url) {
    try {
      const host = new URL(url).hostname;
      return host.replace('www.', '').replace('.com', '');
    } catch (error) {
      return '';
    }
  },

  /**
   * @description post a notification
   * @param {string} name site name
   * @param {boolean} action if action buttons should be added
   */
  notify(name, action) {
    const notificationObject = {
      type: 'basic',
      iconUrl: 'static/images/control.png',
      title: 'TIME LIMIT',
      message: `Time limit exceeded for ${name}`
    };
    if (action) {
      notificationObject.buttons = [
        { title: 'Close Site' }
      ];
      notificationObject.requireInteraction = true;
    }
    // eslint-disable-next-line
    chrome.notifications.create(notificationObject, () => {
      // console.log(id);
    });
  },

  saveConfiguration(key, data) {
    return storage.save(key, data);
  },

  /**
   * @description check if the allotted time has been exceeded
   * @param {string} name the site name
   * @returns {boolean} if the site should be blocked
   */
  isTimeExceeded({ configuration, data }, name) {
    // check if the control is on and time spent on the site is greater than allotted time
    const current = data[this.getCurrentDate()];
    if (configuration[name] && configuration[name].control &&
      current && current[name] > configuration[name].time * 60) {
      this.notify(name);
      return true;
    }
    return false;
  }
};