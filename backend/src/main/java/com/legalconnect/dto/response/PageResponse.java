package com.legalconnect.dto.response;

import lombok.*;
import org.springframework.data.domain.Page;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PageResponse<T> {
    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean last;

    public static <T> PageResponse<T> from(Page<T> pageData) {
        return PageResponse.<T>builder()
            .content(pageData.getContent())
            .page(pageData.getNumber())
            .size(pageData.getSize())
            .totalElements(pageData.getTotalElements())
            .totalPages(pageData.getTotalPages())
            .last(pageData.isLast())
            .build();
    }
}
