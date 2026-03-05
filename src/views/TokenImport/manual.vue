<template>
  <!-- 手动输入表单 -->
  <n-form
    ref="importFormRef"
    :model="importForm"
    :rules="importRules"
    :label-placement="'top'"
    :size="'large'"
    :show-label="true"
  >
    <n-form-item :label="'游戏角色名称'" :path="'name'" :show-label="true">
      <n-input
        v-model:value="importForm.name"
        placeholder="例如：主号战士"
        clearable
      />
    </n-form-item>

    <n-form-item
      :label="'Token字符串'"
      :path="'base64Token'"
      :show-label="true"
    >
      <n-input
        v-model:value="importForm.base64Token"
        type="textarea"
        :rows="3"
        placeholder="粘贴Token字符串..."
        clearable
      >
        <template #suffix>
          <n-popover placement="right" trigger="hover">
            <template #trigger>
              <n-icon :depth="1">
                <AlertCircleOutline />
              </n-icon>
            </template>
            <div class="large-text">
              输入格式为：{"roleToken":"****","sessId":***,"connId":***,"isRestore":***}
            </div>
          </n-popover>
        </template>
      </n-input>
    </n-form-item>

    <!-- 角色详情 -->
    <n-collapse>
      <n-collapse-item title="角色详情 (可选)" name="optional">
        <div class="optional-fields">
          <n-form-item label="服务器">
            <n-input
              v-model:value="importForm.server"
              placeholder="服务器名称"
            />
          </n-form-item>

          <n-form-item label="自定义连接地址">
            <n-input
              v-model:value="importForm.wsUrl"
              placeholder="留空使用默认连接"
            />
          </n-form-item>
        </div>
      </n-collapse-item>
    </n-collapse>

    <div class="form-actions">
      <n-button
        type="primary"
        size="large"
        block
        :loading="isImporting"
        @click="handleImport"
      >
        <template #icon>
          <n-icon>
            <CloudUpload />
          </n-icon>
        </template>
        添加Token
      </n-button>

      <n-button v-if="tokenStore.hasTokens" size="large" block @click="cancel">
        取消
      </n-button>
    </div>
  </n-form>
</template>
<script lang="ts" setup>
import { useTokenStore } from "@/stores/tokenStore";
import apiService from "@/services/apiService";
import { CloudUpload, AlertCircleOutline } from "@vicons/ionicons5";
import {
  NButton,
  NCollapse,
  NCollapseItem,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  useMessage,
} from "naive-ui";
import { reactive, ref } from "vue";

const $emit = defineEmits(["cancel", "ok"]);

const cancel = () => {
  $emit("cancel");
};

const tokenStore = useTokenStore();
const message = useMessage();
const importFormRef = ref();
const isImporting = ref(false);
const importForm = reactive({
  name: "",
  base64Token: "",
  server: "",
  wsUrl: "",
});
const importRules = {
  name: [
    { required: true, message: "请输入角色名称", trigger: "blur" },
    {
      min: 1,
      max: 50,
      message: "名称长度应在1到50个字符之间",
      trigger: "blur",
    },
  ],
  base64Token: [
    { required: true, message: "请输入Token字符串", trigger: "blur" },
    { min: 20, message: "Token字符串长度应至少20个字符", trigger: "blur" },
  ],
};
const handleImport = async () => {
  isImporting.value = true;
  try {
    const tokenData = {
      name: importForm.name,
      token: importForm.base64Token,
      server: importForm.server,
      ws_url: importForm.wsUrl,
    };
    
    const result = await apiService.createToken(tokenData);
    if (result.success) {
      message.success("Token添加成功");
      // 刷新 token 列表
      const tokensResult = await apiService.getTokens();
      if (tokensResult.success) {
        // 清空本地 token 列表
        tokenStore.gameTokens.value = [];
        // 添加从后端获取的 token
        tokensResult.data.forEach((token) => {
          tokenStore.gameTokens.value.push({
            id: token.id,
            name: token.name,
            token: token.token,
            wsUrl: token.ws_url,
            server: token.server,
            remark: token.remark,
            importMethod: token.import_method,
            sourceUrl: token.source_url,
            avatar: token.avatar,
            isActive: token.is_active,
            sortOrder: token.sort_order,
            createdAt: token.created_at,
            updatedAt: token.updated_at
          });
        });
      }
      importForm.name = "";
      importForm.base64Token = "";
      importForm.server = "";
      importForm.wsUrl = "";
      $emit("ok");
    } else {
      message.error(`添加失败: ${result.error}`);
    }
  } catch (error: any) {
    message.error(`添加失败: ${error.message}`);
  } finally {
    isImporting.value = false;
  }
};
</script>
<style lang="scss" scoped>
.optional-fields {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;

  n-form-item {
    flex: 1 1 45%;
    min-width: 200px;
  }
}

.form-actions {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-tips {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
  color: #888;
}

.cors-tip {
  color: #e67e22;
}
</style>
