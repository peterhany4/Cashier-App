import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';

describe('useCart', () => {
    it('adds items, accumulates quantities, and computes the subtotal', () => {
        const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

        act(() => result.current.addToCart({ id: 1, name: 'شاورما', price: 50 }));
        act(() => result.current.addToCart({ id: 1, name: 'شاورما', price: 50 }));
        act(() => result.current.addToCart({ id: 2, name: 'مياه', price: 5 }));

        expect(result.current.cart).toHaveLength(2);
        expect(result.current.cart.find(c => c.id === 1).quantity).toBe(2);
        expect(result.current.getSubtotal()).toBe(105);
    });

    it('removeFromCart decrements then drops the line', () => {
        const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
        act(() => result.current.addToCart({ id: 1, name: 'A', price: 10 }));
        act(() => result.current.addToCart({ id: 1, name: 'A', price: 10 }));

        act(() => result.current.removeFromCart(1));
        expect(result.current.cart[0].quantity).toBe(1);

        act(() => result.current.removeFromCart(1));
        expect(result.current.cart.find(c => c.id === 1)).toBeUndefined();
    });

    it('clearCart empties the cart', () => {
        const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
        act(() => result.current.addToCart({ id: 9, name: 'B', price: 8 }));
        act(() => result.current.clearCart());
        expect(result.current.cart).toHaveLength(0);
    });
});