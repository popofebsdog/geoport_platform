<template>
  <div class="h-full overflow-auto transition-colors duration-300"
       :class="isDarkMode ? 'bg-slate-900 text-white' : 'bg-surface-50 text-gray-900'">
    <div class="px-6 py-5 space-y-5">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-base font-semibold">資料管理後台</h1>
          <p class="text-xs mt-1" :class="mutedTextClass">
            系統資料、檔案健康與上雲維運狀態
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button @click="refreshAll"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-colors"
                  :class="isDarkMode ? 'border-slate-700 text-slate-200 hover:border-slate-500' : 'border-gray-300 text-gray-700 hover:border-gray-500'">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v6h6M20 20v-6h-6M5 19A8 8 0 0119 7M19 5A8 8 0 005 17"/>
            </svg>
            重新整理
          </button>
        </div>
      </div>

      <div v-if="error" class="px-3 py-2 rounded border text-sm"
           :class="isDarkMode ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-red-50 text-red-700 border-red-200'">
        {{ error }}
      </div>

      <section v-if="fileCheckResult" data-file-check class="rounded border overflow-hidden transition-colors" :class="panelClass">
        <div class="px-4 py-3 border-b flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between" :class="borderClass">
          <div class="min-w-0">
            <h2 class="text-sm font-semibold truncate">檔案重新檢查：{{ fileCheckResult.file.original_name || fileCheckResult.file.file_name }}</h2>
            <p class="text-xs mt-0.5 truncate" :class="mutedTextClass">{{ fileCheckResult.file.project_name || '未指定專案' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-0.5 rounded border" :class="healthStatusClass(fileCheckResult.health.status)">
              {{ healthStatusLabel(fileCheckResult.health.status) }}
            </span>
            <button @click="fileCheckResult = null"
                    class="px-2.5 py-1 rounded border text-xs font-medium transition-colors"
                    :class="isDarkMode ? 'border-slate-700 text-slate-200 hover:border-slate-500' : 'border-gray-300 text-gray-700 hover:border-gray-500'">
              關閉
            </button>
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x" :class="divideClass">
          <div class="p-4">
            <p class="text-xs font-semibold mb-2" :class="mutedTextClass">資料庫紀錄</p>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between gap-3">
                <dt :class="mutedTextClass">DB size</dt>
                <dd class="font-medium tabular-nums">{{ fileCheckResult.health.db.fileSizeLabel }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt :class="mutedTextClass">處理狀態</dt>
                <dd>{{ statusLabel(fileCheckResult.health.db.processingStatus) }}</dd>
              </div>
              <div>
                <dt class="mb-1" :class="mutedTextClass">storage_path</dt>
                <dd class="text-xs break-all">{{ fileCheckResult.health.db.storagePath }}</dd>
              </div>
            </dl>
          </div>
          <div class="p-4">
            <p class="text-xs font-semibold mb-2" :class="mutedTextClass">實體檔案</p>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between gap-3">
                <dt :class="mutedTextClass">存在</dt>
                <dd>{{ fileCheckResult.health.disk.exists === null ? '外部儲存' : (fileCheckResult.health.disk.exists ? '是' : '否') }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt :class="mutedTextClass">Disk size</dt>
                <dd class="font-medium tabular-nums">{{ fileCheckResult.health.disk.fileSizeLabel }}</dd>
              </div>
              <div>
                <dt class="mb-1" :class="mutedTextClass">resolved path</dt>
                <dd class="text-xs break-all">{{ fileCheckResult.health.disk.path || '無' }}</dd>
              </div>
            </dl>
          </div>
          <div class="p-4">
            <p class="text-xs font-semibold mb-2" :class="mutedTextClass">建議處理</p>
            <p class="text-sm leading-6">{{ fileCheckResult.health.recommendation }}</p>
            <p class="text-xs mt-3" :class="mutedTextClass">檢查時間：{{ formatDate(fileCheckResult.health.checkedAt) }}</p>
          </div>
        </div>
      </section>

      <section v-if="fileAuditResult" data-file-audit class="rounded border overflow-hidden transition-colors" :class="panelClass">
        <div class="px-4 py-3 border-b flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between" :class="borderClass">
          <div>
            <h2 class="text-sm font-semibold">批次檔案掃描結果</h2>
            <p class="text-xs mt-0.5" :class="mutedTextClass">
              掃描 {{ fileAuditResult.summary.total }} 筆，{{ formatDate(fileAuditResult.checkedAt) }}
            </p>
          </div>
          <button @click="fileAuditResult = null"
                  class="px-2.5 py-1 rounded border text-xs font-medium transition-colors"
                  :class="isDarkMode ? 'border-slate-700 text-slate-200 hover:border-slate-500' : 'border-gray-300 text-gray-700 hover:border-gray-500'">
            關閉
          </button>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x" :class="divideClass">
          <div class="p-4">
            <p class="text-xs" :class="mutedTextClass">正常</p>
            <p class="mt-1 text-xl font-semibold tabular-nums">{{ fileAuditResult.summary.ok || 0 }}</p>
          </div>
          <div class="p-4">
            <p class="text-xs" :class="mutedTextClass">大小不符</p>
            <p class="mt-1 text-xl font-semibold tabular-nums">{{ fileAuditResult.summary['size-mismatch'] || 0 }}</p>
          </div>
          <div class="p-4">
            <p class="text-xs" :class="mutedTextClass">找不到</p>
            <p class="mt-1 text-xl font-semibold tabular-nums">{{ fileAuditResult.summary.missing || 0 }}</p>
          </div>
          <div class="p-4">
            <p class="text-xs" :class="mutedTextClass">外部儲存</p>
            <p class="mt-1 text-xl font-semibold tabular-nums">{{ fileAuditResult.summary.external || 0 }}</p>
          </div>
        </div>
        <div class="border-t divide-y" :class="[borderClass, divideClass]">
          <div v-for="item in fileAuditResult.problems" :key="item.file.file_id" class="px-4 py-3">
            <div class="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs px-2 py-0.5 rounded border" :class="healthStatusClass(item.health.status)">
                    {{ healthStatusLabel(item.health.status) }}
                  </span>
                  <p class="text-sm font-medium truncate">{{ item.file.original_name || item.file.file_name }}</p>
                </div>
                <p class="text-xs mt-1 break-all" :class="mutedTextClass">{{ item.health.recommendation }}</p>
              </div>
              <button @click="checkFile(item.file.file_id)"
                      class="self-start px-2.5 py-1 rounded border text-xs font-medium transition-colors"
                      :class="isDarkMode ? 'border-slate-700 text-slate-200 hover:border-slate-500' : 'border-gray-300 text-gray-700 hover:border-gray-500'">
                查看細節
              </button>
            </div>
          </div>
          <p v-if="!fileAuditResult.problems.length" class="px-4 py-8 text-center text-sm" :class="mutedTextClass">
            批次掃描沒有發現檔案問題。
          </p>
        </div>
      </section>

      <div class="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div v-for="card in summaryCards" :key="card.label"
             class="rounded border p-4 transition-colors"
             :class="panelClass">
          <p class="text-[11px] uppercase tracking-wider" :class="mutedTextClass">{{ card.label }}</p>
          <div class="mt-2 text-xl font-semibold tabular-nums">{{ card.value }}</div>
          <p v-if="card.hint" class="mt-1 text-xs truncate" :class="mutedTextClass">{{ card.hint }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section class="rounded border p-4 transition-colors" :class="panelClass">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold">系統健康</h2>
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border"
                  :class="healthBadgeClass">
              <span class="w-1.5 h-1.5 rounded-full" :class="healthDotClass"></span>
              {{ healthLabel }}
            </span>
          </div>

          <div v-if="healthLoading" class="py-10 text-center text-sm" :class="mutedTextClass">檢查中...</div>
          <div v-else class="mt-4 space-y-3">
            <HealthRow label="Database" :status="health.services?.database?.status" :detail="`${health.services?.database?.latencyMs || 0} ms`" :is-dark-mode="isDarkMode" />
            <HealthRow label="TiTiler" :status="health.services?.titiler?.status" :detail="titilerDetail" :is-dark-mode="isDarkMode" />
            <div class="pt-3 border-t" :class="isDarkMode ? 'border-slate-700' : 'border-gray-100'">
              <p class="text-xs font-medium mb-2">注意事項</p>
              <p v-if="!health.issues?.length" class="text-xs" :class="mutedTextClass">目前沒有系統警示。</p>
              <ul v-else class="space-y-1">
                <li v-for="issue in health.issues" :key="issue" class="text-xs text-amber-600">
                  {{ issue }}
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section class="rounded border p-4 transition-colors" :class="panelClass">
          <h2 class="text-sm font-semibold">儲存空間</h2>
          <div class="mt-4 space-y-3">
            <StorageRow label="uploads" :item="health.storage?.uploads" :is-dark-mode="isDarkMode" />
            <StorageRow label="data" :item="health.storage?.data" :is-dark-mode="isDarkMode" />
          </div>
        </section>

        <section class="rounded border p-4 transition-colors" :class="panelClass">
          <h2 class="text-sm font-semibold">檔案處理狀態</h2>
          <div class="mt-4 space-y-2">
            <div v-for="item in processingStatuses" :key="item.processing_status || 'unknown'"
                 class="flex items-center justify-between text-sm">
              <span :class="mutedTextClass">{{ statusLabel(item.processing_status) }}</span>
              <span class="font-semibold tabular-nums">{{ item.count }}</span>
            </div>
            <p v-if="!processingStatuses.length" class="text-sm" :class="mutedTextClass">尚無檔案資料。</p>
          </div>
        </section>
      </div>

      <section class="rounded border overflow-hidden transition-colors" :class="panelClass">
        <div class="px-4 py-3 border-b flex items-center justify-between" :class="borderClass">
          <div>
            <h2 class="text-sm font-semibold">問題清單</h2>
            <p class="text-xs mt-0.5" :class="mutedTextClass">彙整服務異常、處理失敗、檔案遺失與大小不符</p>
          </div>
          <div class="flex items-center gap-2 text-xs" :class="mutedTextClass">
            <span>高 {{ issueSummary.high || 0 }}</span>
            <span>中 {{ issueSummary.medium || 0 }}</span>
            <span>總計 {{ issueSummary.total || 0 }}</span>
          </div>
        </div>
        <div class="divide-y" :class="divideClass">
          <div v-if="issuesLoading" class="px-4 py-8 text-center text-sm" :class="mutedTextClass">重新檢查中...</div>
          <div v-for="issue in issues" :key="`${issue.type}-${issue.source?.file_id || issue.source?.layer_id || issue.source?.service || issue.detail}`"
               class="px-4 py-3">
            <div class="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs px-2 py-0.5 rounded border" :class="severityClass(issue.severity)">
                    {{ severityLabel(issue.severity) }}
                  </span>
                  <p class="text-sm font-medium truncate">{{ issue.title }}</p>
                </div>
                <p class="text-xs mt-1 break-all" :class="mutedTextClass">{{ issue.detail }}</p>
                <p class="text-xs mt-1" :class="mutedTextClass">
                  {{ issue.source?.project_name || issue.source?.service || '系統' }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button v-if="issue.source?.file_id"
                        @click="checkFile(issue.source.file_id)"
                        class="self-start px-2.5 py-1 rounded border text-xs font-medium transition-colors"
                        :class="isDarkMode ? 'border-slate-700 text-slate-200 hover:border-slate-500' : 'border-gray-300 text-gray-700 hover:border-gray-500'">
                  檢查檔案
                </button>
                <button v-if="issue.source?.project_id"
                        @click="openProjectDetail(issue.source.project_id)"
                        class="self-start px-2.5 py-1 rounded border text-xs font-medium transition-colors"
                        :class="isDarkMode ? 'border-slate-700 text-slate-200 hover:border-slate-500' : 'border-gray-300 text-gray-700 hover:border-gray-500'">
                  查看專案
                </button>
              </div>
            </div>
          </div>
          <p v-if="!issuesLoading && !issues.length" class="px-4 py-8 text-center text-sm" :class="mutedTextClass">
            目前沒有需要處理的資料問題。
          </p>
        </div>
      </section>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section class="rounded border overflow-hidden transition-colors" :class="panelClass">
          <div class="px-4 py-3 border-b" :class="borderClass">
            <h2 class="text-sm font-semibold">最近上傳檔案</h2>
          </div>
          <div class="divide-y" :class="divideClass">
            <div v-for="file in recentFiles" :key="file.file_id" class="px-4 py-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-medium truncate">{{ file.original_name || file.file_name }}</p>
                  <p class="text-xs mt-0.5 truncate" :class="mutedTextClass">{{ file.project_name || '未指定專案' }}</p>
                </div>
                <span class="text-xs px-2 py-0.5 rounded border flex-shrink-0" :class="statusClass(file.processing_status)">
                  {{ statusLabel(file.processing_status) }}
                </span>
              </div>
            </div>
            <p v-if="!recentFiles.length && !loading" class="px-4 py-8 text-center text-sm" :class="mutedTextClass">尚無上傳紀錄。</p>
          </div>
        </section>

        <section class="rounded border overflow-hidden transition-colors" :class="panelClass">
          <div class="px-4 py-3 border-b" :class="borderClass">
            <h2 class="text-sm font-semibold">最近專案</h2>
          </div>
          <div class="divide-y" :class="divideClass">
            <button v-for="project in recentProjects" :key="project.project_id"
                    @click="openProjectDetail(project.project_id)"
                    class="w-full text-left px-4 py-3 transition-colors"
                    :class="isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-gray-50'">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-medium truncate">{{ project.name }}</p>
                  <p class="text-xs mt-0.5" :class="mutedTextClass">
                    {{ project.file_count || 0 }} 檔案 / {{ project.layer_count || 0 }} 圖層
                  </p>
                </div>
                <span class="text-xs tabular-nums" :class="mutedTextClass">{{ formatBytes(project.total_size) }}</span>
              </div>
            </button>
            <p v-if="!recentProjects.length && !loading" class="px-4 py-8 text-center text-sm" :class="mutedTextClass">尚無專案。</p>
          </div>
        </section>
      </div>

      <section class="rounded border overflow-hidden transition-colors" :class="panelClass">
        <div class="px-4 py-3 border-b flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between" :class="borderClass">
          <div>
            <h2 class="text-sm font-semibold">檔案健康檢查</h2>
            <p class="text-xs mt-0.5" :class="mutedTextClass">確認資料庫紀錄與本機檔案是否一致</p>
          </div>
          <div class="flex items-center gap-2">
            <button @click="auditFiles"
                    :disabled="fileAuditLoading"
                    class="px-3 py-1.5 rounded border text-xs font-medium transition-colors disabled:opacity-60"
                    :class="isDarkMode ? 'border-slate-700 text-slate-200 hover:border-slate-500' : 'border-gray-300 text-gray-700 hover:border-gray-500'">
              {{ fileAuditLoading ? '掃描中' : '批次掃描' }}
            </button>
            <input v-model="fileQuery" @keyup.enter="fetchFiles" type="search" placeholder="搜尋檔名"
                   class="w-52 px-3 py-1.5 rounded border text-xs outline-none transition-colors"
                   :class="isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'" />
            <select v-model="fileStatus" @change="fetchFiles"
                    class="px-3 py-1.5 rounded border text-xs outline-none transition-colors"
                    :class="isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'">
              <option value="">全部狀態</option>
              <option value="pending">待處理</option>
              <option value="processing">處理中</option>
              <option value="completed">完成</option>
              <option value="failed">失敗</option>
            </select>
            <button @click="fetchFiles"
                    class="px-3 py-1.5 rounded border text-xs font-medium transition-colors"
                    :class="isDarkMode ? 'border-slate-700 text-slate-200 hover:border-slate-500' : 'border-gray-300 text-gray-700 hover:border-gray-500'">
              套用
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b" :class="borderClass">
                <th class="px-4 py-3 text-left font-medium" :class="mutedTextClass">檔案</th>
                <th class="px-4 py-3 text-left font-medium" :class="mutedTextClass">專案</th>
                <th class="px-4 py-3 text-left font-medium" :class="mutedTextClass">大小</th>
                <th class="px-4 py-3 text-left font-medium" :class="mutedTextClass">狀態</th>
                <th class="px-4 py-3 text-left font-medium" :class="mutedTextClass">本機檔案</th>
                <th class="px-4 py-3 text-left font-medium" :class="mutedTextClass">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y" :class="divideClass">
              <tr v-if="filesLoading">
                <td colspan="6" class="px-4 py-10 text-center" :class="mutedTextClass">載入中...</td>
              </tr>
              <tr v-for="file in files" :key="file.file_id" :class="isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-gray-50'">
                <td class="px-4 py-3 min-w-64">
                  <p class="font-medium truncate">{{ file.original_name || file.file_name }}</p>
                  <p class="text-xs truncate" :class="mutedTextClass">{{ file.storage_path }}</p>
                </td>
                <td class="px-4 py-3 min-w-40" :class="mutedTextClass">{{ file.project_name || '未指定' }}</td>
                <td class="px-4 py-3 whitespace-nowrap tabular-nums">{{ file.file_size_label }}</td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2 py-0.5 rounded border" :class="statusClass(file.processing_status)">
                    {{ statusLabel(file.processing_status) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2 py-0.5 rounded border" :class="fileBadgeClass(file)">
                    {{ fileBadgeLabel(file) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <button @click="checkFile(file.file_id)"
                          :disabled="checkingFileId === file.file_id"
                          class="px-2.5 py-1 rounded border text-xs font-medium transition-colors disabled:opacity-60"
                          :class="isDarkMode ? 'border-slate-700 text-slate-200 hover:border-slate-500' : 'border-gray-300 text-gray-700 hover:border-gray-500'">
                    {{ checkingFileId === file.file_id ? '檢查中' : '檢查' }}
                  </button>
                </td>
              </tr>
              <tr v-if="!filesLoading && !files.length">
                <td colspan="6" class="px-4 py-10 text-center" :class="mutedTextClass">沒有符合條件的檔案。</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="selectedProject" data-project-detail class="rounded border overflow-hidden transition-colors" :class="panelClass">
        <div class="px-4 py-3 border-b flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between" :class="borderClass">
          <div class="min-w-0">
            <h2 class="text-sm font-semibold truncate">專案資料詳情：{{ selectedProject.project.name }}</h2>
            <p class="text-xs mt-0.5" :class="mutedTextClass">
              {{ selectedProject.summary.files }} 檔案 / {{ selectedProject.summary.layers }} 圖層 / {{ selectedProject.summary.disasterPoints }} 災點
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button @click="$router.push(`/projects/${selectedProject.project.project_id}`)"
                    class="px-2.5 py-1 rounded border text-xs font-medium transition-colors"
                    :class="isDarkMode ? 'border-slate-700 text-slate-200 hover:border-slate-500' : 'border-gray-300 text-gray-700 hover:border-gray-500'">
              開啟專案
            </button>
            <button @click="selectedProject = null"
                    class="px-2.5 py-1 rounded border text-xs font-medium transition-colors"
                    :class="isDarkMode ? 'border-slate-700 text-slate-200 hover:border-slate-500' : 'border-gray-300 text-gray-700 hover:border-gray-500'">
              關閉
            </button>
          </div>
        </div>

        <div v-if="projectLoading" class="px-4 py-10 text-center text-sm" :class="mutedTextClass">載入專案詳情...</div>
        <div v-else class="grid grid-cols-1 xl:grid-cols-3 gap-0 divide-y xl:divide-y-0 xl:divide-x" :class="divideClass">
          <div class="p-4">
            <h3 class="text-xs font-semibold mb-3" :class="mutedTextClass">檔案</h3>
            <div class="space-y-2 max-h-80 overflow-auto">
              <div v-for="file in selectedProject.files" :key="file.file_id"
                   class="rounded border p-3" :class="isDarkMode ? 'border-slate-700 bg-slate-900/30' : 'border-gray-100 bg-gray-50'">
                <p class="text-sm font-medium truncate">{{ file.original_name || file.file_name }}</p>
                <div class="mt-2 flex items-center justify-between gap-2">
                  <span class="text-xs" :class="mutedTextClass">{{ file.file_size_label }}</span>
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs px-2 py-0.5 rounded border" :class="fileBadgeClass(file)">{{ fileBadgeLabel(file) }}</span>
                    <button @click="checkFile(file.file_id)"
                            class="px-2 py-0.5 rounded border text-xs transition-colors"
                            :class="isDarkMode ? 'border-slate-700 text-slate-200 hover:border-slate-500' : 'border-gray-300 text-gray-700 hover:border-gray-500'">
                      檢查
                    </button>
                  </div>
                </div>
              </div>
              <p v-if="!selectedProject.files.length" class="text-sm" :class="mutedTextClass">無檔案。</p>
            </div>
          </div>

          <div class="p-4">
            <h3 class="text-xs font-semibold mb-3" :class="mutedTextClass">圖層</h3>
            <div class="space-y-2 max-h-80 overflow-auto">
              <div v-for="layer in selectedProject.layers" :key="layer.layer_id"
                   class="rounded border p-3" :class="isDarkMode ? 'border-slate-700 bg-slate-900/30' : 'border-gray-100 bg-gray-50'">
                <p class="text-sm font-medium truncate">{{ layer.display_name || layer.layer_name }}</p>
                <div class="mt-2 flex items-center justify-between gap-2">
                  <span class="text-xs" :class="mutedTextClass">{{ layer.geometry_type || 'geometry' }} · {{ layer.feature_count || 0 }} features</span>
                  <span class="text-xs px-2 py-0.5 rounded border" :class="statusClass(layer.processing_status)">{{ statusLabel(layer.processing_status) }}</span>
                </div>
              </div>
              <p v-if="!selectedProject.layers.length" class="text-sm" :class="mutedTextClass">無圖層。</p>
            </div>
          </div>

          <div class="p-4">
            <h3 class="text-xs font-semibold mb-3" :class="mutedTextClass">災點</h3>
            <div class="space-y-2 max-h-80 overflow-auto">
              <div v-for="point in selectedProject.disasterPoints" :key="point.disaster_point_id"
                   class="rounded border p-3" :class="isDarkMode ? 'border-slate-700 bg-slate-900/30' : 'border-gray-100 bg-gray-50'">
                <p class="text-sm font-medium truncate">{{ point.name }}</p>
                <p class="text-xs mt-1" :class="mutedTextClass">{{ point.latitude }}, {{ point.longitude }}</p>
              </div>
              <p v-if="!selectedProject.disasterPoints.length" class="text-sm" :class="mutedTextClass">無災點。</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { adminAPI } from '@/services/api.js'

const HealthRow = {
  props: { label: String, status: String, detail: String, isDarkMode: Boolean },
  computed: {
    statusText() { return this.status === 'ok' ? '正常' : '異常' },
    badgeClass() {
      if (this.status === 'ok') {
        return this.isDarkMode ? 'text-emerald-300 border-emerald-900 bg-emerald-950/30' : 'text-emerald-700 border-emerald-200 bg-emerald-50'
      }
      return this.isDarkMode ? 'text-red-300 border-red-900 bg-red-950/30' : 'text-red-700 border-red-200 bg-red-50'
    },
    mutedClass() { return this.isDarkMode ? 'text-slate-400' : 'text-gray-500' }
  },
  template: `
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-sm font-medium">{{ label }}</p>
        <p class="text-xs mt-0.5" :class="mutedClass">{{ detail }}</p>
      </div>
      <span class="text-xs px-2 py-0.5 rounded border" :class="badgeClass">{{ statusText }}</span>
    </div>
  `
}

const StorageRow = {
  props: { label: String, item: Object, isDarkMode: Boolean },
  computed: {
    mutedClass() { return this.isDarkMode ? 'text-slate-400' : 'text-gray-500' }
  },
  template: `
    <div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-medium">{{ label }}</span>
        <span class="text-sm font-semibold tabular-nums">{{ item?.label || '0 B' }}</span>
      </div>
      <p class="text-xs mt-1 truncate" :class="mutedClass">{{ item?.fileCount || 0 }} files · {{ item?.path || '' }}</p>
    </div>
  `
}

export default {
  name: 'AdminDashboard',
  components: { HealthRow, StorageRow },
  props: { isDarkMode: Boolean },
  data() {
    return {
      loading: false,
      healthLoading: false,
      filesLoading: false,
      error: '',
      overview: null,
      health: {},
      files: [],
      issues: [],
      issueSummary: {},
      selectedProject: null,
      fileCheckResult: null,
      fileAuditResult: null,
      checkingFileId: null,
      fileAuditLoading: false,
      fileQuery: '',
      fileStatus: '',
      issuesLoading: false,
      projectLoading: false
    }
  },
  computed: {
    panelClass() {
      return this.isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
    },
    borderClass() {
      return this.isDarkMode ? 'border-slate-700' : 'border-gray-200'
    },
    divideClass() {
      return this.isDarkMode ? 'divide-slate-700' : 'divide-gray-100'
    },
    mutedTextClass() {
      return this.isDarkMode ? 'text-slate-400' : 'text-gray-500'
    },
    summaryCards() {
      const summary = this.overview?.summary || {}
      return [
        { label: '專案', value: summary.projects || 0 },
        { label: '檔案', value: summary.dataFiles || 0, hint: summary.totalFileSizeLabel || '0 B' },
        { label: '圖層', value: summary.spatialLayers || 0 },
        { label: '災點', value: summary.disasterPoints || 0 },
        { label: '預警區', value: summary.warningRegions || 0 },
        { label: '使用者', value: summary.users || 0 }
      ]
    },
    recentFiles() {
      return this.overview?.recent?.files || []
    },
    recentProjects() {
      return this.overview?.recent?.projects || []
    },
    processingStatuses() {
      return this.overview?.charts?.processingStatuses || []
    },
    healthLabel() {
      if (!this.health.status) return '未知'
      return this.health.status === 'ok' ? '正常' : this.health.status === 'warning' ? '需注意' : '異常'
    },
    healthBadgeClass() {
      if (this.health.status === 'ok') return this.isDarkMode ? 'text-emerald-300 border-emerald-900 bg-emerald-950/30' : 'text-emerald-700 border-emerald-200 bg-emerald-50'
      if (this.health.status === 'warning') return this.isDarkMode ? 'text-amber-300 border-amber-900 bg-amber-950/30' : 'text-amber-700 border-amber-200 bg-amber-50'
      return this.isDarkMode ? 'text-red-300 border-red-900 bg-red-950/30' : 'text-red-700 border-red-200 bg-red-50'
    },
    healthDotClass() {
      if (this.health.status === 'ok') return 'bg-emerald-500'
      if (this.health.status === 'warning') return 'bg-amber-500'
      return 'bg-red-500'
    },
    titilerDetail() {
      const titiler = this.health.services?.titiler || {}
      const parts = []
      if (titiler.version) parts.push(`v${titiler.version}`)
      if (titiler.latencyMs !== undefined) parts.push(`${titiler.latencyMs} ms`)
      if (!parts.length && titiler.message) parts.push(titiler.message)
      return parts.join(' · ') || '尚未檢查'
    }
  },
  methods: {
    formatBytes(size) {
      const value = Number(size || 0)
      if (value < 1024) return `${value} B`
      const units = ['KB', 'MB', 'GB', 'TB']
      let next = value / 1024
      let unit = units.shift()
      while (next >= 1024 && units.length) {
        next /= 1024
        unit = units.shift()
      }
      return `${next.toFixed(next >= 10 ? 1 : 2)} ${unit}`
    },
    formatDate(dateStr) {
      if (!dateStr) return '無'
      return new Date(dateStr).toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    statusLabel(status) {
      return {
        pending: '待處理',
        processing: '處理中',
        completed: '完成',
        failed: '失敗'
      }[status] || status || '未知'
    },
    statusClass(status) {
      if (status === 'completed') return this.isDarkMode ? 'text-emerald-300 border-emerald-900 bg-emerald-950/30' : 'text-emerald-700 border-emerald-200 bg-emerald-50'
      if (status === 'failed') return this.isDarkMode ? 'text-red-300 border-red-900 bg-red-950/30' : 'text-red-700 border-red-200 bg-red-50'
      if (status === 'processing') return this.isDarkMode ? 'text-blue-300 border-blue-900 bg-blue-950/30' : 'text-blue-700 border-blue-200 bg-blue-50'
      return this.isDarkMode ? 'text-slate-300 border-slate-700 bg-slate-900/50' : 'text-gray-600 border-gray-200 bg-gray-50'
    },
    severityClass(severity) {
      if (severity === 'high') return this.isDarkMode ? 'text-red-300 border-red-900 bg-red-950/30' : 'text-red-700 border-red-200 bg-red-50'
      if (severity === 'medium') return this.isDarkMode ? 'text-amber-300 border-amber-900 bg-amber-950/30' : 'text-amber-700 border-amber-200 bg-amber-50'
      return this.isDarkMode ? 'text-slate-300 border-slate-700 bg-slate-900/50' : 'text-gray-600 border-gray-200 bg-gray-50'
    },
    severityLabel(severity) {
      return { high: '高', medium: '中', low: '低' }[severity] || '未分級'
    },
    healthStatusClass(status) {
      if (status === 'ok') return this.statusClass('completed')
      if (status === 'size-mismatch') return this.severityClass('medium')
      if (status === 'missing') return this.severityClass('high')
      return this.statusClass('pending')
    },
    healthStatusLabel(status) {
      return {
        ok: '一致',
        external: '外部儲存',
        missing: '找不到',
        'size-mismatch': '大小不符'
      }[status] || '未知'
    },
    fileBadgeClass(file) {
      if (file.local_file_exists === null) return this.statusClass('pending')
      if (!file.local_file_exists) return this.statusClass('failed')
      if (file.size_matches === false) return this.isDarkMode ? 'text-amber-300 border-amber-900 bg-amber-950/30' : 'text-amber-700 border-amber-200 bg-amber-50'
      return this.statusClass('completed')
    },
    fileBadgeLabel(file) {
      if (file.local_file_exists === null) return '外部儲存'
      if (!file.local_file_exists) return '找不到'
      if (file.size_matches === false) return '大小不符'
      return '存在'
    },
    async fetchOverview() {
      this.loading = true
      try {
        this.overview = await adminAPI.getOverview()
      } catch (err) {
        this.error = err.response?.data?.message || '無法載入管理總覽'
      } finally {
        this.loading = false
      }
    },
    async fetchHealth() {
      this.healthLoading = true
      try {
        this.health = await adminAPI.getHealth()
      } catch (err) {
        this.error = err.response?.data?.message || '無法載入健康檢查'
      } finally {
        this.healthLoading = false
      }
    },
    async fetchFiles() {
      this.filesLoading = true
      try {
        this.files = (await adminAPI.getFiles({
          q: this.fileQuery || undefined,
          status: this.fileStatus || undefined,
          limit: 40
        })).files || []
      } catch (err) {
        this.error = err.response?.data?.message || '無法載入檔案健康資料'
      } finally {
        this.filesLoading = false
      }
    },
    async fetchIssues() {
      this.issuesLoading = true
      try {
        const result = await adminAPI.getIssues()
        this.issues = result.issues || []
        this.issueSummary = result.summary || {}
      } catch (err) {
        this.error = err.response?.data?.message || '無法載入問題清單'
      } finally {
        this.issuesLoading = false
      }
    },
    async checkFile(fileId) {
      this.checkingFileId = fileId
      this.error = ''
      try {
        this.fileCheckResult = await adminAPI.checkFile(fileId)
        this.$nextTick(() => {
          const el = this.$el.querySelector('[data-file-check]')
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      } catch (err) {
        this.error = err.response?.data?.message || '無法檢查檔案'
      } finally {
        this.checkingFileId = null
      }
    },
    async auditFiles() {
      this.fileAuditLoading = true
      this.error = ''
      try {
        this.fileAuditResult = await adminAPI.auditFiles({ limit: 500 })
        await this.fetchIssues()
        this.$nextTick(() => {
          const el = this.$el.querySelector('[data-file-audit]')
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      } catch (err) {
        this.error = err.response?.data?.message || '無法執行批次檔案掃描'
      } finally {
        this.fileAuditLoading = false
      }
    },
    async openProjectDetail(projectId) {
      this.projectLoading = true
      try {
        this.selectedProject = await adminAPI.getProjectDetail(projectId)
        this.$nextTick(() => {
          const el = this.$el.querySelector('[data-project-detail]')
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      } catch (err) {
        this.error = err.response?.data?.message || '無法載入專案詳情'
      } finally {
        this.projectLoading = false
      }
    },
    async refreshAll() {
      this.error = ''
      await Promise.all([this.fetchOverview(), this.fetchHealth(), this.fetchFiles(), this.fetchIssues()])
    }
  },
  mounted() {
    this.refreshAll()
  }
}
</script>
