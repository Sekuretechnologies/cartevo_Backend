export declare class CreateCustomerDto {
    first_name: string;
    last_name: string;
    country: string;
    email: string;
    street: string;
    city: string;
    state: string;
    postal_code: string;
    phone_country_code: string;
    phone_number: string;
    identification_number: string;
    type: string;
    image?: string;
    photo?: string;
    number: string;
    dob: string;
}
export declare class CustomerResponseDto {
    id: string;
    first_name: string;
    last_name: string;
    country: string;
    email: string;
    street: string;
    city: string;
    state: string;
    postal_code: string;
    phone_country_code: string;
    phone_number: string;
    identification_number: string;
    type: string;
    image?: string;
    photo?: string;
    number: string;
    dob: Date;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
