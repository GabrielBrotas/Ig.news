import { GetStaticPaths, GetStaticProps } from "next"
import { useSession } from "next-auth/client";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { RichText } from "prismic-dom";
import { useEffect } from "react";
import { getPrismicClient } from "../../../services/prismic";

import styles from '../post.module.scss';

interface PostPreviewProps {
    post: {
        slug: string;
        title: string;
        content: string;
        updatedAt: string;
    }
}

export default function PostPreview({ post }: PostPreviewProps) {
    const [session] = useSession();
    const router = useRouter();

    useEffect(() => {
        if(session?.activeSubscription) {
            router.push(`/posts/${post.slug}`)
        }
    }, [session])

    return (
        <>
            <Head>
                <title>{post.title} | Ignews</title>
            </Head>

            <main className={styles.container}>
                <article className={styles.post}>
                    <h1>{post.title}</h1>
                    <time>{post.updatedAt}</time>
                    <div className={`${styles.postContent} ${styles.previewContent}`} dangerouslySetInnerHTML={{__html: post.content}} />

                    <div className={styles.continueReading}>
                        Wanna continue readind?
                        <Link href="#">
                            <a>Subscribe now 🤗</a>
                        </Link>
                    </div>
                </article>
            </main>
        </>
    )
}

export const getStaticPaths: GetStaticPaths = async () => {
    /*
    ? paths
    esse array vai ser as url das paginas que vao ser gerardas estaticas previamente, deixando vazio todos os posts vao ser gerados conforme o primeiro acesso de um usuario,
    exemplo de um ecommerce,
    poderiamos fazer uma chamada para os produtos mais quente e deixar eles previamente carregados, ex:
    paths: [
        { params: { slug: { 'toyotismo-entenda-como-funciona-esse-sistema-de-producao' } } }
    ]
    ? fallback
        pode receber:
        true -> caso um usuario acesse uma rota que ainda não foi previamente carregada ele vai fazer uma chamada pelo lado do cliente e depois vai mostrar o conteudo, carrega a pagina sem o conteudo e depois mostra e tem o problema de SEO, pois o conteudo nao vai estar disponivel
        false -> se o conteudo nao foi previamente carregado ele vai retornar um 404 e nao vai tentar buscar um novo post
        blocking -> quando tenta acessar um conteudo novo ele vai fazer a chamada porem pelo lado do next e nao pelo lado do cliente
    */
    return {
        paths: [], 
        fallback: 'blocking'
    }
}

export const getStaticProps: GetStaticProps = async ({params}) => {
    const { slug } = params;

    const prismic = getPrismicClient();

    const response = await prismic.getByUID('post', String(slug), {})

    const post = {
        slug,
        title : RichText.asText(response.data.title),
        content: RichText.asText(response.data.content.splice(0, 3)),
        updatedAt: new Date(response.last_publication_date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
    }

    return {
        props: {
            post,
        },
        revalidate: 60 * 30 // 30 minutos
    }
}
