import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Login from '../views/Login.vue'

vi.mock('@/services/api.js', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
  },
}))

describe('Login smoke test', () => {
  const mountOptions = {
    global: {
      mocks: {
        $route: { query: {}, name: 'Login' },
        $router: {
          push: vi.fn(),
          afterEach: vi.fn(),
        },
      },
      stubs: {
        'router-view': true,
        'router-link': true,
      },
    },
  }

  beforeEach(() => {
    localStorage.clear()
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
      const wrapper = mount(Login, mountOptions)
      wrapper.unmount()
    }).not.toThrow()
  })

  it('renders GeoPORTech brand text', () => {
    const wrapper = mount(Login, mountOptions)

    expect(wrapper.text()).toContain('GeoPORTech')
    wrapper.unmount()
  })

  it('renders login form inputs and submit button', () => {
    const wrapper = mount(Login, mountOptions)

    expect(wrapper.find('input[autocomplete="username"]').exists()).toBe(true)
    expect(wrapper.find('input[autocomplete="current-password"]').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').text()).toContain('登入')
    wrapper.unmount()
  })

  it('renders feature list items', () => {
    const wrapper = mount(Login, mountOptions)

    expect(wrapper.text()).toContain('即時監測資料整合')
    expect(wrapper.text()).toContain('地理空間分析與視覺化')
    expect(wrapper.text()).toContain('告警事件追蹤管理')
    wrapper.unmount()
  })

  it('toggles dark mode class when toggle button is clicked', async () => {
    const wrapper = mount(Login, mountOptions)
    const root = wrapper.find('div.min-h-screen.flex')

    expect(root.classes()).not.toContain('dark')

    const toggleButton = wrapper.findAll('button').find((button) => button.text().includes('深色模式'))
    expect(toggleButton).toBeTruthy()

    await toggleButton.trigger('click')
    expect(root.classes()).toContain('dark')
    expect(localStorage.getItem('darkMode')).toBe('true')

    wrapper.unmount()
  })
})
