import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ProjectManagement from '../views/ProjectManagement.vue'

const pushMock = vi.fn()

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRouter: () => ({
      push: pushMock,
    }),
  }
})

vi.mock('@/services/api.js', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ success: true, data: [] }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}))

vi.mock('@/utils/simpleAlertService.js', () => ({
  alert: vi.fn(),
  confirm: vi.fn().mockResolvedValue(true),
  error: vi.fn(),
}))

describe('ProjectManagement smoke test', () => {
  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

  const mountOptions = {
    global: {
      mocks: {
        $route: { name: 'ProjectManagement' },
        $router: {
          push: vi.fn(),
          afterEach: vi.fn(),
        },
      },
      stubs: {
        'router-view': true,
        'router-link': true,
        ParentProjectCard: true,
        CreateParentProjectModal: true,
        EditParentProjectModal: true,
        CreateChildProjectModal: {
          template: '<div data-testid="create-child-modal-stub" />',
          props: ['isVisible', 'parentProject'],
        },
      },
      provide: {
        isDarkMode: ref(false),
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('mounts without throwing an error', () => {
    expect(() => {
      const wrapper = mount(ProjectManagement, mountOptions)
      wrapper.unmount()
    }).not.toThrow()
  })

  it('renders page title text 專案管理', () => {
    const wrapper = mount(ProjectManagement, mountOptions)

    expect(wrapper.text()).toContain('專案管理')
    wrapper.unmount()
  })

  it('renders search input', () => {
    const wrapper = mount(ProjectManagement, mountOptions)

    expect(wrapper.find('input[placeholder="搜尋專案..."]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders create location button', () => {
    const wrapper = mount(ProjectManagement, mountOptions)

    const createButton = wrapper.findAll('button').find((button) => button.text().includes('新增地點'))
    expect(createButton).toBeTruthy()
    wrapper.unmount()
  })

  it('renders empty state text when no projects exist', async () => {
    const wrapper = mount(ProjectManagement, mountOptions)
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('尚無專案')
    expect(wrapper.text()).toContain('開始創建您的第一個地點專案')
    wrapper.unmount()
  })
})
