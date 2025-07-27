export declare class CreateCustomerDto {
    first_name: string;
    last_name: string;
    country: string;
    email: string;
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country_iso_code: string;
    country_phone_code: string;
    phone_number: string;
    identification_number: string;
    id_document_front: string;
    id_document_back?: string;
    id_document_type: string;
    image?: string;
    photo?: string;
    number: string;
    date_of_birth: string;
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
    date_of_birth: Date;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
