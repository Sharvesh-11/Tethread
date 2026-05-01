import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type CartItem = {
	id: string;
	name: string;
	price: number;
	image_url: string;
	quantity: number;
};

type AddItemPayload = Omit<CartItem, 'quantity'> & {
	quantity?: number;
};

type CartStore = {
	items: CartItem[];
	addItem: (product: AddItemPayload) => void;
	removeItem: (id: string) => void;
	updateQuantity: (id: string, quantity: number) => void;
	clearCart: () => void;
	totalItems: () => number;
	totalPrice: () => number;
};

export const useCartStore = create<CartStore>()(
	persist(
		(set, get) => ({
			items: [],

			addItem: (product) => {
				const quantityToAdd = product.quantity ?? 1;

				set((state) => {
					const existingItem = state.items.find((item) => item.id === product.id);

					if (existingItem) {
						return {
							items: state.items.map((item) =>
								item.id === product.id
									? { ...item, quantity: item.quantity + quantityToAdd }
									: item
							),
						};
					}

					const newItem: CartItem = {
						...product,
						quantity: quantityToAdd,
					};

					return { items: [...state.items, newItem] };
				});
			},

			removeItem: (id) => {
				set((state) => ({
					items: state.items.filter((item) => item.id !== id),
				}));
			},

			updateQuantity: (id, quantity) => {
				if (quantity <= 0) {
					set((state) => ({
						items: state.items.filter((item) => item.id !== id),
					}));
					return;
				}

				set((state) => ({
					items: state.items.map((item) =>
						item.id === id ? { ...item, quantity } : item
					),
				}));
			},

			clearCart: () => {
				set({ items: [] });
			},

			totalItems: () => {
				return get().items.reduce((sum, item) => sum + item.quantity, 0);
			},

			totalPrice: () => {
				return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
			},
		}),
		{
			name: 'tethread-cart',
			storage: createJSONStorage(() => localStorage),
			skipHydration: true,
			partialize: (state) => ({ items: state.items }),
		}
	)
);
