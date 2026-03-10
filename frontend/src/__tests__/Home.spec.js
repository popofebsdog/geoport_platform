import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Home from '../views/Home.vue'

describe('Home smoke test', () => {
  const mountOptions = {
    global: {
      mocks: {
        $route: { name: 'Home' },
        $router: {
          push: vi.fn(),
          afterEach: vi.fn(),
        },
      },
      stubs: {
        'router-view': true,
        'router-link': true,
        MapComponent: true,
      },
      provide: {
        isDarkMode: false,
      },
    },
  }

  beforeEach(() => {
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
      const wrapper = mount(Home, mountOptions)
      wrapper.unmount()
    }).not.toThrow()
  })

  it('renders hero heading text GeoPort', () => {
    const wrapper = mount(Home, mountOptions)

    expect(wrapper.text()).toContain('GeoPort')
    expect(wrapper.text()).toContain('山區公路防災預警系統')
    wrapper.unmount()
  })

  it('renders system status indicators', () => {
    const wrapper = mount(Home, mountOptions)

    expect(wrapper.text()).toContain('系統正常')
    expect(wrapper.text()).toContain('即時監控')
    expect(wrapper.text()).toContain('預警模式')
    wrapper.unmount()
  })

  it('renders feature cards', () => {
    const wrapper = mount(Home, mountOptions)

    expect(wrapper.text()).toContain('災情資料搜集')
    expect(wrapper.text()).toContain('預警分析平台')
    wrapper.unmount()
  })

  it('renders map monitoring section', () => {
    const wrapper = mount(Home, mountOptions)

    expect(wrapper.text()).toContain('即時地圖監控')
    expect(wrapper.findComponent({ name: 'MapComponent' }).exists()).toBe(true)
    wrapper.unmount()
  })
})
