/*
cron "2 9 * * *" sign_flyingbird.js, tag=flyingbird签到
*/
const axios = require('axios')
const notify = require('./sendNotify')
const { initInstance, getEnv} = require('./ql_api.js')
const signinURL = 'http://flyingbird.pro/user/checkin'


// 获取环境变量
async function getCookieValue() {
  let instance = null;
  let cookieValue = []; // 定义 switchck 变量，确保在 if 和 else 中都可以访问
  let cookieValueArray = [];
  try {
    instance = await initInstance();
    if (instance) {
      cookieValue = await getEnv(instance, 'flyingbirdck');
    } else {
      cookieValue = process.env.flyingbirdck || [];
    }
  } catch (e) {}

  try {
    if (Array.isArray(cookieValue)) {
      cookieValueArray = cookieValue.map(item => item.value);
    } else if (cookieValue.indexOf('&') > -1) {
      cookieValueArray = cookieValue.split('&');
    } else if (cookieValue.indexOf('\n') > -1) {
      cookieValueArray = cookieValue.split('\n');
    } else {
      cookieValueArray = [cookieValue];
    }

    if (!cookieValueArray.length) {
      console.log('未获取到 cookieValue, 程序终止');
      process.exit(1);
    }
  } catch (error) {
    console.error('处理 cookieValue 出错：', error);
  }
  // 返回获取到的 instance 和 cookieValueArray
  return {
    instance,
    cookieValueArray
  };
}


async function sign_in(cookieValue, remarks){
  const sendMessage = [remarks]
  return axios(signinURL, {
    method: 'POST',
    data: {},
    headers: {
      'Cookie': cookieValue,
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.data)
  .then(async json => {
      if (json.ret != 1) {
        sendMessage.push('签到失败', json.msg)
        return Promise.reject(sendMessage.join(', '))
      }
      sendMessage.push('签到成功', json.msg)
  })
}

!(async () => {
  const {cookieValueArray} = await getCookieValue()
  const message = []
  let index = 1
  for await(flyingbirdck of cookieValueArray) {
    let remarks = flyingbirdck.remarks || `账号${index}`
    try {
      console.log(remarks)
      const sendMessage = await sign_in(flyingbirdck, remarks)
      console.log(sendMessage)
      console.log('\n')
      message.push(sendMessage)
    } catch (e) {
      console.log(e)
      console.log('\n')
      message.push(e)
    }
    index++
  }
  await notify.sendNotify(`flyingbird签到`, message.join('\n'))
  
  })()