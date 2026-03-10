import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'

describe('App smoke test', () => {
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
      const wrapper = mount(App, {
        global: {
          mocks: {
            $route: { name: 'DisasterCollection' },
            $router: {
              push: vi.fn(),
              afterEach: vi.fn(),
            },
          },
          stubs: {
            'router-view': true,
          },
        },
      })

      wrapper.unmount()
    }).not.toThrow()
  })

  it('renders the root app container', () => {
    const wrapper = mount(App, {
      global: {
        mocks: {
          $route: { name: 'DisasterCollection' },
          $router: {
            push: vi.fn(),
            afterEach: vi.fn(),
          },
        },
        stubs: {
          'router-view': true,
        },
      },
    })

    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })
})
