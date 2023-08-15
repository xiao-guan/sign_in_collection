/*
cron "0 9 * * *" sign_switch.js, tag=switch520签到
*/
const axios = require('axios')
const { JSDOM } = require('jsdom')
const notify = require('./sendNotify')
const { initInstance, getEnv} = require('./qlApi.js')
const getnonceURL = 'https://www.switch520.org/user/coin';
const signinURL = 'https://www.switch520.org/wp-admin/admin-ajax.php'


// 获取环境变量
async function getCookieValue() {
  let instance = null;
  let cookieValue = []; // 定义 switchck 变量，确保在 if 和 else 中都可以访问
  let cookieValueArray = [];
  try {
    instance = await initInstance();
    if (instance) {
      cookieValue = await getEnv(instance, 'switchck');
    } else {
      cookieValue = process.env.switchck || [];
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


async function getNonce(cookieValue){
  return axios(getnonceURL, {
    method: 'GET',
    headers:{'Cookie':cookieValue}
  })
  .then(response => response.data)
  .then(html => {
    // 使用 jsdom 解析 HTML
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // 现在您可以使用 doc 对象来访问和操作页面的文档对象模型（DOM）
    const buttonElement = doc.querySelector('.go-user-qiandao');
    const dataNonce = buttonElement.getAttribute('data-nonce');
    console.log(dataNonce);
    return dataNonce; // 将 dataNonce 作为结果返回
  })
  .catch(error => {
    console.error('请求出错：', error);
    throw error; // 抛出错误，让调用方知道发生了错误
  });
}


async function sign_in(cookieValue, remarks){
  const nonce = await getNonce(cookieValue)
  console.log(nonce)
  const sendMessage = [remarks]
  return axios(signinURL, {
    method: 'POST',
    data: `action=user_qiandao&nonce=${nonce}`,
    headers: {
      'Cookie': cookieValue,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
  .then(response => response.data)
  .then(async json => {
      console.log(json)
      if (json.status != 1) {
        sendMessage.push('签到失败', json.message)
        return Promise.reject(sendMessage.join(', '))
      }
      sendMessage.push('签到成功')
  })
}

!(async () => {
  const {cookieValueArray} = await getCookieValue()
  // console.log(cookieValueArray)
  const message = []
  let index = 1
  for await(switchck of cookieValueArray) {
    console.log(switchck)
    let remarks = switchck.remarks || `账号${index}`
    try {
      console.log(remarks)
      const sendMessage = await sign_in(switchck, remarks)
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
  await notify.sendNotify(`switch520签到`, message.join('\n'))
  
  })()