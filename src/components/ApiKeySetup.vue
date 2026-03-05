<template>
  <div class="api-key-setup">
    <div class="setup-container">
      <div class="setup-card">
        <div class="logo">
          <h1>XYZW 游戏管理系统</h1>
        </div>
        
        <div class="setup-content">
          <n-icon size="64" color="#667eea">
            <KeyOutline />
          </n-icon>
          
          <h2>请输入 API 密钥</h2>
          <p class="description">
            此站点需要 API 密钥才能访问。请输入您在后端设置的 API 密钥。
          </p>
          
          <n-form ref="formRef" :model="formData" :rules="rules">
            <n-form-item path="apiKey" label="API 密钥">
              <n-input
                v-model:value="formData.apiKey"
                type="password"
                placeholder="请输入 API 密钥"
                @keyup.enter="handleSubmit"
                :loading="loading"
              />
            </n-form-item>
            
            <n-button
              type="primary"
              block
              size="large"
              :loading="loading"
              @click="handleSubmit"
            >
              确认并进入
            </n-button>
          </n-form>
          
          <p v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </p>
        </div>
        
        <div class="setup-footer">
          <p>如需获取 API 密钥，请联系系统管理员</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { KeyOutline } from '@vicons/ionicons5';
import apiService, { setBackendApiKey } from '@/services/apiService';

const router = useRouter();
const message = useMessage();

const formRef = ref(null);
const loading = ref(false);
const errorMessage = ref('');

const formData = reactive({
  apiKey: ''
});

const rules = {
  apiKey: [
    { required: true, message: '请输入 API 密钥', trigger: 'blur' }
  ]
};

const handleSubmit = async () => {
  if (!formData.apiKey) {
    errorMessage.value = '请输入 API 密钥';
    return;
  }
  
  loading.value = true;
  errorMessage.value = '';
  
  try {
    // 保存API密钥
    setBackendApiKey(formData.apiKey);
    
    // 测试API连接
    const testResult = await apiService.getTokens();
    
    if (testResult.success) {
      // 验证成功
      message.success('API 密钥验证成功');
      // 跳转到首页
      router.push('/home');
    } else if (testResult.error && !testResult.error.includes('Unauthorized')) {
      // 验证成功（没有401错误）
      message.success('API 密钥验证成功');
      router.push('/home');
    } else {
      // 验证失败，清除密钥
      setBackendApiKey('');
      errorMessage.value = testResult.error || 'API 密钥验证失败，请检查密钥是否正确';
    }
  } catch (error) {
    console.error('API 密钥验证失败:', error);
    setBackendApiKey('');
    errorMessage.value = 'API 密钥验证失败，请检查后端服务是否运行';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped lang="scss">
.api-key-setup {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.setup-container {
  width: 100%;
  max-width: 440px;
}

.setup-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.logo {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px 20px;
  text-align: center;
  
  h1 {
    color: white;
    font-size: 24px;
    font-weight: 600;
    margin: 0;
  }
}

.setup-content {
  padding: 40px 30px;
  text-align: center;
  
  .n-icon {
    margin-bottom: 16px;
  }
  
  h2 {
    font-size: 20px;
    font-weight: 600;
    color: #333;
    margin: 0 0 8px 0;
  }
  
  .description {
    font-size: 14px;
    color: #666;
    margin: 0 0 24px 0;
    line-height: 1.5;
  }
  
  .n-form {
    text-align: left;
  }
  
  .n-button {
    margin-top: 16px;
  }
  
  .error-message {
    color: #e74c3c;
    font-size: 14px;
    margin-top: 16px;
    padding: 12px;
    background: rgba(231, 76, 60, 0.1);
    border-radius: 8px;
  }
}

.setup-footer {
  padding: 16px 30px;
  background: #f5f5f5;
  text-align: center;
  
  p {
    margin: 0;
    font-size: 12px;
    color: #999;
  }
}
</style>
